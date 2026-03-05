//! Approval Workflow System
//!
//! Manages human-in-the-loop approval for sensitive actions.
//! Supports timeout-based auto-approval, escalation, and audit trails.

use super::{ClassifiedAction, ActionContextForValidation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Approval request for a pending action
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ApprovalRequest {
    /// Unique request ID
    pub id: String,

    /// Action that needs approval
    pub action_id: String,

    /// Classification of the action
    pub classification: ClassifiedAction,

    /// Original action context
    pub context: ActionContextForValidation,

    /// When the request was created
    pub created_at: f64,

    /// When the request expires (auto-deny if not approved)
    pub expires_at: f64,

    /// Current status
    pub status: String,

    /// Who approved/denied (if applicable)
    pub decided_by: Option<String>,

    /// When the decision was made
    pub decided_at: Option<f64>,

    /// Reason for approval/denial
    pub reason: Option<String>,

    /// Priority level (higher = more urgent)
    pub priority: f64,

    /// Escalation level
    pub escalation_level: f64,
}

/// Approval manager that handles pending requests
pub struct ApprovalManager {
    /// Pending approval requests
    pending: HashMap<String, ApprovalRequest>,

    /// Completed requests (history)
    completed: Vec<ApprovalRequest>,

    /// Default timeout for approvals (seconds)
    default_timeout: f64,

    /// Auto-deny on timeout (vs auto-approve)
    auto_deny_on_timeout: bool,

    /// Maximum escalation level
    max_escalation_level: f64,

    /// Escalation interval (seconds)
    escalation_interval: f64,
}

impl Default for ApprovalManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ApprovalManager {
    pub fn new() -> Self {
        ApprovalManager {
            pending: HashMap::new(),
            completed: Vec::new(),
            default_timeout: 300.0, // 5 minutes
            auto_deny_on_timeout: true,
            max_escalation_level: 3.0,
            escalation_interval: 60.0, // 1 minute
        }
    }

    /// Set default timeout
    pub fn with_timeout(mut self, seconds: f64) -> Self {
        self.default_timeout = seconds;
        self
    }

    /// Set auto-deny on timeout
    pub fn with_auto_deny(mut self, deny: bool) -> Self {
        self.auto_deny_on_timeout = deny;
        self
    }

    /// Create a new approval request
    pub fn request_approval(
        &mut self,
        classification: ClassifiedAction,
        context: ActionContextForValidation,
    ) -> ApprovalRequest {
        let now = current_timestamp();
        let request = ApprovalRequest {
            id: generate_approval_id(),
            action_id: classification.id.clone(),
            classification,
            context,
            created_at: now,
            expires_at: now + self.default_timeout,
            status: "pending".to_string(),
            decided_by: None,
            decided_at: None,
            reason: None,
            priority: 1.0,
            escalation_level: 0.0,
        };

        self.pending.insert(request.id.clone(), request.clone());
        request
    }

    /// Approve a pending request
    pub fn approve(
        &mut self,
        request_id: &str,
        approver: &str,
        reason: Option<&str>,
    ) -> Option<ApprovalRequest> {
        if let Some(mut request) = self.pending.remove(request_id) {
            request.status = "approved".to_string();
            request.decided_by = Some(approver.to_string());
            request.decided_at = Some(current_timestamp());
            request.reason = reason.map(|s| s.to_string());

            self.completed.push(request.clone());
            Some(request)
        } else {
            None
        }
    }

    /// Deny a pending request
    pub fn deny(
        &mut self,
        request_id: &str,
        denier: &str,
        reason: Option<&str>,
    ) -> Option<ApprovalRequest> {
        if let Some(mut request) = self.pending.remove(request_id) {
            request.status = "denied".to_string();
            request.decided_by = Some(denier.to_string());
            request.decided_at = Some(current_timestamp());
            request.reason = reason.map(|s| s.to_string());

            self.completed.push(request.clone());
            Some(request)
        } else {
            None
        }
    }

    /// Check for expired requests and handle them
    pub fn process_timeouts(&mut self) -> Vec<ApprovalRequest> {
        let now = current_timestamp();
        let expired: Vec<String> = self.pending
            .iter()
            .filter(|(_, req)| req.expires_at < now)
            .map(|(id, _)| id.clone())
            .collect();

        let mut processed = Vec::new();

        for id in expired {
            if self.auto_deny_on_timeout {
                if let Some(request) = self.deny(&id, "system", Some("Request timed out")) {
                    processed.push(request);
                }
            } else {
                if let Some(request) = self.approve(&id, "system", Some("Auto-approved after timeout")) {
                    processed.push(request);
                }
            }
        }

        processed
    }

    /// Escalate requests that have been pending too long
    pub fn process_escalations(&mut self) -> Vec<ApprovalRequest> {
        let now = current_timestamp();
        let mut escalated = Vec::new();

        for (_, request) in self.pending.iter_mut() {
            let elapsed = now - request.created_at;
            let expected_escalation = (elapsed / self.escalation_interval).floor();

            if expected_escalation > request.escalation_level
                && request.escalation_level < self.max_escalation_level
            {
                request.escalation_level = expected_escalation.min(self.max_escalation_level);
                request.priority += 1.0;
                escalated.push(request.clone());
            }
        }

        escalated
    }

    /// Get pending request by ID
    pub fn get_pending(&self, request_id: &str) -> Option<&ApprovalRequest> {
        self.pending.get(request_id)
    }

    /// Get all pending requests
    pub fn list_pending(&self) -> Vec<&ApprovalRequest> {
        self.pending.values().collect()
    }

    /// Get completed requests (history)
    pub fn get_history(&self, limit: Option<usize>) -> Vec<ApprovalRequest> {
        let start = if let Some(limit) = limit {
            self.completed.len().saturating_sub(limit)
        } else {
            0
        };
        self.completed[start..].to_vec()
    }

    /// Check if a request is approved
    pub fn is_approved(&self, request_id: &str) -> bool {
        self.completed
            .iter()
            .find(|r| r.id == request_id)
            .map(|r| r.status == "approved")
            .unwrap_or(false)
    }

    /// Cancel a pending request
    pub fn cancel(&mut self, request_id: &str) -> Option<ApprovalRequest> {
        if let Some(mut request) = self.pending.remove(request_id) {
            request.status = "cancelled".to_string();
            request.decided_at = Some(current_timestamp());
            self.completed.push(request.clone());
            Some(request)
        } else {
            None
        }
    }

    /// Get statistics
    pub fn stats(&self) -> ApprovalStats {
        let pending_count = self.pending.len() as f64;
        let approved_count = self.completed.iter().filter(|r| r.status == "approved").count() as f64;
        let denied_count = self.completed.iter().filter(|r| r.status == "denied").count() as f64;
        let cancelled_count = self.completed.iter().filter(|r| r.status == "cancelled").count() as f64;

        ApprovalStats {
            pending_count,
            approved_count,
            denied_count,
            cancelled_count,
            total_processed: self.completed.len() as f64,
        }
    }
}

fn generate_approval_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let mut hasher = DefaultHasher::new();
    now.hash(&mut hasher);

    format!("approval-{:016x}", hasher.finish())
}

fn current_timestamp() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ApprovalStats {
    pub pending_count: f64,
    pub approved_count: f64,
    pub denied_count: f64,
    pub cancelled_count: f64,
    pub total_processed: f64,
}

/// Create a new approval manager
#[napi_derive::napi]
pub fn create_approval_manager() -> ApprovalManagerHandle {
    ApprovalManagerHandle {
        manager: ApprovalManager::new(),
    }
}

/// Handle for approval manager
#[napi]
pub struct ApprovalManagerHandle {
    manager: ApprovalManager,
}

#[napi]
impl ApprovalManagerHandle {
    /// Request approval for an action
    #[napi]
    pub fn request_approval(
        &mut self,
        classification: ClassifiedAction,
        context: ActionContextForValidation,
    ) -> ApprovalRequest {
        self.manager.request_approval(classification, context)
    }

    /// Approve a pending request
    #[napi]
    pub fn approve(
        &mut self,
        request_id: String,
        approver: String,
        reason: Option<String>,
    ) -> Option<ApprovalRequest> {
        self.manager.approve(&request_id, &approver, reason.as_deref())
    }

    /// Deny a pending request
    #[napi]
    pub fn deny(
        &mut self,
        request_id: String,
        denier: String,
        reason: Option<String>,
    ) -> Option<ApprovalRequest> {
        self.manager.deny(&request_id, &denier, reason.as_deref())
    }

    /// Cancel a pending request
    #[napi]
    pub fn cancel(&mut self, request_id: String) -> Option<ApprovalRequest> {
        self.manager.cancel(&request_id)
    }

    /// Process expired requests
    #[napi]
    pub fn process_timeouts(&mut self) -> Vec<ApprovalRequest> {
        self.manager.process_timeouts()
    }

    /// Process escalations
    #[napi]
    pub fn process_escalations(&mut self) -> Vec<ApprovalRequest> {
        self.manager.process_escalations()
    }

    /// Get pending request by ID
    #[napi]
    pub fn get_pending(&self, request_id: String) -> Option<ApprovalRequest> {
        self.manager.get_pending(&request_id).cloned()
    }

    /// List all pending requests
    #[napi]
    pub fn list_pending(&self) -> Vec<ApprovalRequest> {
        self.manager.list_pending().into_iter().cloned().collect()
    }

    /// Get history of completed requests
    #[napi]
    pub fn get_history(&self, limit: Option<f64>) -> Vec<ApprovalRequest> {
        let limit = limit.map(|l| l as usize);
        self.manager.get_history(limit)
    }

    /// Check if a request is approved
    #[napi]
    pub fn is_approved(&self, request_id: String) -> bool {
        self.manager.is_approved(&request_id)
    }

    /// Get statistics
    #[napi]
    pub fn stats(&self) -> ApprovalStats {
        self.manager.stats()
    }

    /// Set default timeout (seconds)
    #[napi]
    pub fn set_timeout(&mut self, seconds: f64) {
        self.manager.default_timeout = seconds;
    }

    /// Set auto-deny on timeout
    #[napi]
    pub fn set_auto_deny(&mut self, deny: bool) {
        self.manager.auto_deny_on_timeout = deny;
    }
}
