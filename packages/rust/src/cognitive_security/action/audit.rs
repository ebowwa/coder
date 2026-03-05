//! Action Audit Trail
//!
//! Maintains an immutable record of all actions taken by the agent.
//! Supports querying, filtering, and exporting audit logs.

use super::{ClassifiedAction, ActionValidationResult};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs::{self, OpenOptions};
use std::io::Write;

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AuditEntry {
    /// Unique entry ID
    pub id: String,

    /// Sequence number (monotonically increasing)
    pub sequence: f64,

    /// When the action occurred
    pub timestamp: f64,

    /// Action that was attempted
    pub action: ClassifiedAction,

    /// Validation result
    pub validation: ActionValidationResult,

    /// Whether the action was executed
    pub executed: bool,

    /// Execution result (if executed)
    pub execution_result: Option<String>,

    /// Session ID
    pub session_id: Option<String>,

    /// Agent ID that performed the action
    pub agent_id: Option<String>,

    /// Correlation ID for tracking related actions
    pub correlation_id: Option<String>,

    /// Additional metadata (JSON string)
    pub metadata: Option<String>,
}

/// Audit log manager
pub struct AuditLog {
    /// In-memory log entries
    entries: VecDeque<AuditEntry>,

    /// Maximum entries to keep in memory
    max_entries: usize,

    /// Next sequence number
    next_sequence: f64,

    /// Optional file path for persistence
    file_path: Option<String>,

    /// Whether to sync to disk on every write
    sync_on_write: bool,
}

impl Default for AuditLog {
    fn default() -> Self {
        Self::new()
    }
}

impl AuditLog {
    pub fn new() -> Self {
        AuditLog {
            entries: VecDeque::with_capacity(10000),
            max_entries: 100000,
            next_sequence: 1.0,
            file_path: None,
            sync_on_write: true,
        }
    }

    /// Set maximum entries
    pub fn with_max_entries(mut self, max: usize) -> Self {
        self.max_entries = max;
        self
    }

    /// Set file path for persistence
    pub fn with_file(mut self, path: impl Into<String>) -> Self {
        self.file_path = Some(path.into());
        self
    }

    /// Set sync on write
    pub fn with_sync(mut self, sync: bool) -> Self {
        self.sync_on_write = sync;
        self
    }

    /// Log an action
    pub fn log(
        &mut self,
        action: ClassifiedAction,
        validation: ActionValidationResult,
        executed: bool,
        execution_result: Option<String>,
    ) -> AuditEntry {
        let entry = AuditEntry {
            id: generate_audit_id(),
            sequence: self.next_sequence,
            timestamp: current_timestamp(),
            action,
            validation,
            executed,
            execution_result,
            session_id: None,
            agent_id: None,
            correlation_id: None,
            metadata: None,
        };

        self.next_sequence += 1.0;

        // Add to memory
        if self.entries.len() >= self.max_entries {
            self.entries.pop_front();
        }
        self.entries.push_back(entry.clone());

        // Persist if file is set
        if self.file_path.is_some() {
            self.persist_entry(&entry);
        }

        entry
    }

    /// Log with additional context
    pub fn log_with_context(
        &mut self,
        action: ClassifiedAction,
        validation: ActionValidationResult,
        executed: bool,
        execution_result: Option<String>,
        session_id: Option<String>,
        agent_id: Option<String>,
        correlation_id: Option<String>,
    ) -> AuditEntry {
        let mut entry = self.log(action, validation, executed, execution_result);
        entry.session_id = session_id;
        entry.agent_id = agent_id;
        entry.correlation_id = correlation_id;
        entry
    }

    /// Persist entry to file
    fn persist_entry(&self, entry: &AuditEntry) {
        if let Some(ref path) = self.file_path {
            let line = match serde_json::to_string(entry) {
                Ok(s) => s,
                Err(_) => return,
            };

            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
            {
                let _ = writeln!(file, "{}", line);
                if self.sync_on_write {
                    let _ = file.sync_all();
                }
            }
        }
    }

    /// Load entries from file
    pub fn load_from_file(&mut self, path: &str) -> Result<usize, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        let mut loaded = 0;
        for line in content.lines() {
            if let Ok(entry) = serde_json::from_str::<AuditEntry>(line) {
                if self.entries.len() >= self.max_entries {
                    self.entries.pop_front();
                }
                self.entries.push_back(entry);
                loaded += 1;
            }
        }

        // Update sequence
        self.next_sequence = self.entries
            .back()
            .map(|e| e.sequence + 1.0)
            .unwrap_or(1.0);

        Ok(loaded)
    }

    /// Get all entries
    pub fn entries(&self) -> &VecDeque<AuditEntry> {
        &self.entries
    }

    /// Get entries by session
    pub fn by_session(&self, session_id: &str) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.session_id.as_deref() == Some(session_id))
            .collect()
    }

    /// Get entries by agent
    pub fn by_agent(&self, agent_id: &str) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.agent_id.as_deref() == Some(agent_id))
            .collect()
    }

    /// Get entries by action type
    pub fn by_action_type(&self, action_type: &str) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.action.action_type == action_type)
            .collect()
    }

    /// Get entries by domain
    pub fn by_domain(&self, domain: &str) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.action.domain == domain)
            .collect()
    }

    /// Get entries in time range
    pub fn by_time_range(&self, start: f64, end: f64) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .collect()
    }

    /// Get blocked actions
    pub fn blocked(&self) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| !e.validation.allowed)
            .collect()
    }

    /// Get executed actions
    pub fn executed(&self) -> Vec<&AuditEntry> {
        self.entries
            .iter()
            .filter(|e| e.executed)
            .collect()
    }

    /// Get statistics
    pub fn stats(&self) -> AuditStats {
        let total = self.entries.len() as f64;
        let blocked = self.entries.iter().filter(|e| !e.validation.allowed).count() as f64;
        let executed = self.entries.iter().filter(|e| e.executed).count() as f64;

        let mut by_type: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        let mut by_domain: std::collections::HashMap<String, f64> = std::collections::HashMap::new();

        for entry in &self.entries {
            *by_type.entry(entry.action.action_type.clone()).or_insert(0.0) += 1.0;
            *by_domain.entry(entry.action.domain.clone()).or_insert(0.0) += 1.0;
        }

        let first_timestamp = self.entries.front().map(|e| e.timestamp).unwrap_or(0.0);
        let last_timestamp = self.entries.back().map(|e| e.timestamp).unwrap_or(0.0);

        AuditStats {
            total_entries: total,
            blocked_count: blocked,
            executed_count: executed,
            by_action_type: by_type.into_iter().map(|(k, v)| TypeCount { action_type: k, count: v }).collect(),
            by_domain: by_domain.into_iter().map(|(k, v)| DomainCount { domain: k, count: v }).collect(),
            first_timestamp,
            last_timestamp,
        }
    }

    /// Export to JSONL
    pub fn export_jsonl(&self) -> String {
        self.entries
            .iter()
            .filter_map(|e| serde_json::to_string(e).ok())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Export to JSON array
    pub fn export_json(&self) -> String {
        serde_json::to_string_pretty(&self.entries.as_slices().0)
            .unwrap_or_else(|_| "[]".to_string())
    }

    /// Clear all entries
    pub fn clear(&mut self) {
        self.entries.clear();
        self.next_sequence = 1.0;
    }
}

fn generate_audit_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let mut hasher = DefaultHasher::new();
    now.hash(&mut hasher);

    format!("audit-{:016x}", hasher.finish())
}

fn current_timestamp() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AuditStats {
    pub total_entries: f64,
    pub blocked_count: f64,
    pub executed_count: f64,
    pub by_action_type: Vec<TypeCount>,
    pub by_domain: Vec<DomainCount>,
    pub first_timestamp: f64,
    pub last_timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct TypeCount {
    pub action_type: String,
    pub count: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DomainCount {
    pub domain: String,
    pub count: f64,
}

/// Create a new audit log
#[napi_derive::napi]
pub fn create_audit_log() -> AuditLogHandle {
    AuditLogHandle {
        log: AuditLog::new(),
    }
}

/// Handle for audit log
#[napi]
pub struct AuditLogHandle {
    log: AuditLog,
}

#[napi]
impl AuditLogHandle {
    /// Log an action
    #[napi]
    pub fn log(
        &mut self,
        action: ClassifiedAction,
        validation: ActionValidationResult,
        executed: bool,
        execution_result: Option<String>,
    ) -> AuditEntry {
        self.log.log(action, validation, executed, execution_result)
    }

    /// Log with context
    #[napi]
    pub fn log_with_context(
        &mut self,
        action: ClassifiedAction,
        validation: ActionValidationResult,
        executed: bool,
        execution_result: Option<String>,
        session_id: Option<String>,
        agent_id: Option<String>,
        correlation_id: Option<String>,
    ) -> AuditEntry {
        self.log.log_with_context(
            action,
            validation,
            executed,
            execution_result,
            session_id,
            agent_id,
            correlation_id,
        )
    }

    /// Get entries by session
    #[napi]
    pub fn by_session(&self, session_id: String) -> Vec<AuditEntry> {
        self.log.by_session(&session_id).into_iter().cloned().collect()
    }

    /// Get entries by agent
    #[napi]
    pub fn by_agent(&self, agent_id: String) -> Vec<AuditEntry> {
        self.log.by_agent(&agent_id).into_iter().cloned().collect()
    }

    /// Get entries by action type
    #[napi]
    pub fn by_action_type(&self, action_type: String) -> Vec<AuditEntry> {
        self.log.by_action_type(&action_type).into_iter().cloned().collect()
    }

    /// Get entries by domain
    #[napi]
    pub fn by_domain(&self, domain: String) -> Vec<AuditEntry> {
        self.log.by_domain(&domain).into_iter().cloned().collect()
    }

    /// Get entries in time range
    #[napi]
    pub fn by_time_range(&self, start: f64, end: f64) -> Vec<AuditEntry> {
        self.log.by_time_range(start, end).into_iter().cloned().collect()
    }

    /// Get blocked actions
    #[napi]
    pub fn blocked(&self) -> Vec<AuditEntry> {
        self.log.blocked().into_iter().cloned().collect()
    }

    /// Get executed actions
    #[napi]
    pub fn executed(&self) -> Vec<AuditEntry> {
        self.log.executed().into_iter().cloned().collect()
    }

    /// Get recent entries
    #[napi]
    pub fn recent(&self, limit: f64) -> Vec<AuditEntry> {
        let limit = limit as usize;
        self.log.entries()
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Get statistics
    #[napi]
    pub fn stats(&self) -> AuditStats {
        self.log.stats()
    }

    /// Export to JSONL
    #[napi]
    pub fn export_jsonl(&self) -> String {
        self.log.export_jsonl()
    }

    /// Set file path for persistence
    #[napi]
    pub fn set_file_path(&mut self, path: String) {
        self.log.file_path = Some(path);
    }

    /// Set max entries
    #[napi]
    pub fn set_max_entries(&mut self, max: f64) {
        self.log.max_entries = max as usize;
    }

    /// Clear all entries
    #[napi]
    pub fn clear(&mut self) {
        self.log.clear();
    }

    /// Get entry count
    #[napi]
    pub fn count(&self) -> f64 {
        self.log.entries.len() as f64
    }
}
