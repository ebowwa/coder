//! Flow Tracking
//!
//! Tracks all information flows through the system.
//! Provides audit trails, lineage tracking, and flow analytics.

use super::{ClassifiedData, FlowRecord, FlowValidationResult};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use sha2::{Sha256, Digest};

/// Flow tracker that records all data movements
pub struct FlowTracker {
    /// Flow records
    flows: VecDeque<FlowRecord>,

    /// Maximum flows to keep in memory
    max_flows: usize,

    /// Data lineage tracking (data_id -> flow chain)
    lineage: HashMap<String, Vec<String>>,

    /// Flow statistics by domain
    domain_stats: HashMap<String, DomainFlowStats>,

    /// Optional file path for persistence
    file_path: Option<String>,

    /// Next sequence number
    next_sequence: f64,
}

/// Statistics for a domain
#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
struct DomainFlowStats {
    inbound_count: f64,
    outbound_count: f64,
    inbound_bytes: f64,
    outbound_bytes: f64,
    blocked_count: f64,
    by_sensitivity: HashMap<String, f64>,
}

impl Default for FlowTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl FlowTracker {
    pub fn new() -> Self {
        FlowTracker {
            flows: VecDeque::with_capacity(10000),
            max_flows: 100000,
            lineage: HashMap::new(),
            domain_stats: HashMap::new(),
            file_path: None,
            next_sequence: 1.0,
        }
    }

    /// Set maximum flows to keep
    pub fn with_max_flows(mut self, max: usize) -> Self {
        self.max_flows = max;
        self
    }

    /// Set file path for persistence
    pub fn with_file(mut self, path: impl Into<String>) -> Self {
        self.file_path = Some(path.into());
        self
    }

    /// Record a flow
    pub fn record(
        &mut self,
        data: &ClassifiedData,
        source_domain: &str,
        target_domain: &str,
        direction: &str,
        validation: &FlowValidationResult,
        session_id: Option<&str>,
        action_id: Option<&str>,
    ) -> FlowRecord {
        let data_hash = hash_data(&data.id);

        let record = FlowRecord {
            id: generate_flow_id(),
            data_id: data.id.clone(),
            source_domain: source_domain.to_string(),
            target_domain: target_domain.to_string(),
            direction: direction.to_string(),
            allowed: validation.allowed,
            reason: validation.reason.clone(),
            policy_id: validation.applied_policy.clone(),
            session_id: session_id.map(|s| s.to_string()),
            action_id: action_id.map(|a| a.to_string()),
            timestamp: current_timestamp(),
            data_hash,
        };

        // Update lineage
        self.lineage
            .entry(data.id.clone())
            .or_insert_with(Vec::new)
            .push(record.id.clone());

        // Update domain stats
        self.update_domain_stats(source_domain, target_domain, direction, validation, &data.sensitivity);

        // Add to memory (with eviction)
        if self.flows.len() >= self.max_flows {
            self.flows.pop_front();
        }
        self.flows.push_back(record.clone());

        self.next_sequence += 1.0;

        // Persist if file is set
        if self.file_path.is_some() {
            self.persist_flow(&record);
        }

        record
    }

    fn update_domain_stats(
        &mut self,
        source: &str,
        target: &str,
        _direction: &str,
        validation: &FlowValidationResult,
        sensitivity: &str,
    ) {
        // Update source domain stats
        let source_stats = self.domain_stats.entry(source.to_string()).or_default();
        source_stats.outbound_count += 1.0;
        if !validation.allowed {
            source_stats.blocked_count += 1.0;
        }
        *source_stats.by_sensitivity.entry(sensitivity.to_string()).or_insert(0.0) += 1.0;

        // Update target domain stats
        let target_stats = self.domain_stats.entry(target.to_string()).or_default();
        target_stats.inbound_count += 1.0;
        if !validation.allowed {
            target_stats.blocked_count += 1.0;
        }
        *target_stats.by_sensitivity.entry(sensitivity.to_string()).or_insert(0.0) += 1.0;
    }

    fn persist_flow(&self, flow: &FlowRecord) {
        if let Some(ref path) = self.file_path {
            if let Ok(json) = serde_json::to_string(flow) {
                use std::fs::OpenOptions;
                use std::io::Write;

                if let Ok(mut file) = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(path)
                {
                    let _ = writeln!(file, "{}", json);
                }
            }
        }
    }

    /// Get flow by ID
    pub fn get_flow(&self, flow_id: &str) -> Option<&FlowRecord> {
        self.flows.iter().find(|f| f.id == flow_id)
    }

    /// Get lineage for data
    pub fn get_lineage(&self, data_id: &str) -> Vec<&FlowRecord> {
        if let Some(flow_ids) = self.lineage.get(data_id) {
            flow_ids
                .iter()
                .filter_map(|id| self.get_flow(id))
                .collect()
        } else {
            vec![]
        }
    }

    /// Get flows by source domain
    pub fn by_source(&self, domain: &str) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.source_domain == domain)
            .collect()
    }

    /// Get flows by target domain
    pub fn by_target(&self, domain: &str) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.target_domain == domain)
            .collect()
    }

    /// Get flows by session
    pub fn by_session(&self, session_id: &str) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.session_id.as_deref() == Some(session_id))
            .collect()
    }

    /// Get flows by action
    pub fn by_action(&self, action_id: &str) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.action_id.as_deref() == Some(action_id))
            .collect()
    }

    /// Get blocked flows
    pub fn blocked(&self) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| !f.allowed)
            .collect()
    }

    /// Get allowed flows
    pub fn allowed(&self) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.allowed)
            .collect()
    }

    /// Get flows in time range
    pub fn by_time_range(&self, start: f64, end: f64) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .filter(|f| f.timestamp >= start && f.timestamp <= end)
            .collect()
    }

    /// Get recent flows
    pub fn recent(&self, limit: usize) -> Vec<&FlowRecord> {
        self.flows
            .iter()
            .rev()
            .take(limit)
            .collect()
    }

    /// Get statistics
    pub fn stats(&self) -> FlowTrackerStats {
        let total = self.flows.len() as f64;
        let allowed = self.flows.iter().filter(|f| f.allowed).count() as f64;
        let blocked = total - allowed;

        let mut by_direction: HashMap<String, f64> = HashMap::new();
        let mut by_source: HashMap<String, f64> = HashMap::new();
        let mut by_target: HashMap<String, f64> = HashMap::new();

        for flow in &self.flows {
            *by_direction.entry(flow.direction.clone()).or_insert(0.0) += 1.0;
            *by_source.entry(flow.source_domain.clone()).or_insert(0.0) += 1.0;
            *by_target.entry(flow.target_domain.clone()).or_insert(0.0) += 1.0;
        }

        let first_timestamp = self.flows.front().map(|f| f.timestamp).unwrap_or(0.0);
        let last_timestamp = self.flows.back().map(|f| f.timestamp).unwrap_or(0.0);

        FlowTrackerStats {
            total_flows: total,
            allowed_count: allowed,
            blocked_count: blocked,
            by_direction: by_direction.into_iter().map(|(k, v)| DirectionCount { direction: k, count: v }).collect(),
            by_source_domain: by_source.into_iter().map(|(k, v)| DomainFlowCount { domain: k, count: v }).collect(),
            by_target_domain: by_target.into_iter().map(|(k, v)| DomainFlowCount { domain: k, count: v }).collect(),
            first_timestamp,
            last_timestamp,
        }
    }

    /// Get domain statistics
    pub fn domain_stats(&self, domain: &str) -> Option<DomainStats> {
        self.domain_stats.get(domain).map(|s| DomainStats {
            domain: domain.to_string(),
            inbound_count: s.inbound_count,
            outbound_count: s.outbound_count,
            blocked_count: s.blocked_count,
            by_sensitivity: s.by_sensitivity.clone(),
        })
    }

    /// Export flows to JSONL
    pub fn export_jsonl(&self) -> String {
        self.flows
            .iter()
            .filter_map(|f| serde_json::to_string(f).ok())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Clear all flows
    pub fn clear(&mut self) {
        self.flows.clear();
        self.lineage.clear();
        self.domain_stats.clear();
        self.next_sequence = 1.0;
    }
}

fn generate_flow_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let mut hasher = DefaultHasher::new();
    now.hash(&mut hasher);

    format!("flow-{:016x}", hasher.finish())
}

fn hash_data(data_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data_id.as_bytes());
    hex::encode(&hasher.finalize()[..8])
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
pub struct FlowTrackerStats {
    pub total_flows: f64,
    pub allowed_count: f64,
    pub blocked_count: f64,
    pub by_direction: Vec<DirectionCount>,
    pub by_source_domain: Vec<DomainFlowCount>,
    pub by_target_domain: Vec<DomainFlowCount>,
    pub first_timestamp: f64,
    pub last_timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DirectionCount {
    pub direction: String,
    pub count: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DomainFlowCount {
    pub domain: String,
    pub count: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DomainStats {
    pub domain: String,
    pub inbound_count: f64,
    pub outbound_count: f64,
    pub blocked_count: f64,
    pub by_sensitivity: std::collections::HashMap<String, f64>,
}

/// Create a flow tracker
#[napi_derive::napi]
pub fn create_flow_tracker() -> FlowTrackerHandle {
    FlowTrackerHandle {
        tracker: FlowTracker::new(),
    }
}

/// Handle for flow tracker
#[napi]
pub struct FlowTrackerHandle {
    tracker: FlowTracker,
}

#[napi]
impl FlowTrackerHandle {
    /// Record a flow
    #[napi]
    pub fn record(
        &mut self,
        data: ClassifiedData,
        source_domain: String,
        target_domain: String,
        direction: String,
        validation: FlowValidationResult,
        session_id: Option<String>,
        action_id: Option<String>,
    ) -> FlowRecord {
        self.tracker.record(
            &data,
            &source_domain,
            &target_domain,
            &direction,
            &validation,
            session_id.as_deref(),
            action_id.as_deref(),
        )
    }

    /// Get flow by ID
    #[napi]
    pub fn get_flow(&self, flow_id: String) -> Option<FlowRecord> {
        self.tracker.get_flow(&flow_id).cloned()
    }

    /// Get lineage for data
    #[napi]
    pub fn get_lineage(&self, data_id: String) -> Vec<FlowRecord> {
        self.tracker.get_lineage(&data_id).into_iter().cloned().collect()
    }

    /// Get flows by source domain
    #[napi]
    pub fn by_source(&self, domain: String) -> Vec<FlowRecord> {
        self.tracker.by_source(&domain).into_iter().cloned().collect()
    }

    /// Get flows by target domain
    #[napi]
    pub fn by_target(&self, domain: String) -> Vec<FlowRecord> {
        self.tracker.by_target(&domain).into_iter().cloned().collect()
    }

    /// Get flows by session
    #[napi]
    pub fn by_session(&self, session_id: String) -> Vec<FlowRecord> {
        self.tracker.by_session(&session_id).into_iter().cloned().collect()
    }

    /// Get blocked flows
    #[napi]
    pub fn blocked(&self) -> Vec<FlowRecord> {
        self.tracker.blocked().into_iter().cloned().collect()
    }

    /// Get allowed flows
    #[napi]
    pub fn allowed(&self) -> Vec<FlowRecord> {
        self.tracker.allowed().into_iter().cloned().collect()
    }

    /// Get recent flows
    #[napi]
    pub fn recent(&self, limit: f64) -> Vec<FlowRecord> {
        self.tracker.recent(limit as usize).into_iter().cloned().collect()
    }

    /// Get statistics
    #[napi]
    pub fn stats(&self) -> FlowTrackerStats {
        self.tracker.stats()
    }

    /// Get domain statistics
    #[napi]
    pub fn domain_stats(&self, domain: String) -> Option<DomainStats> {
        self.tracker.domain_stats(&domain)
    }

    /// Get flow count
    #[napi]
    pub fn count(&self) -> f64 {
        self.tracker.flows.len() as f64
    }

    /// Clear all flows
    #[napi]
    pub fn clear(&mut self) {
        self.tracker.clear();
    }

    /// Set max flows
    #[napi]
    pub fn set_max_flows(&mut self, max: f64) {
        self.tracker.max_flows = max as usize;
    }

    /// Export to JSONL
    #[napi]
    pub fn export_jsonl(&self) -> String {
        self.tracker.export_jsonl()
    }
}
