//! Action Validation and Control Module
//!
//! Classifies, validates, and controls agent actions based on intent.
//! Implements domain-agnostic action taxonomy with pluggable handlers.
//!
//! Key concepts:
//! - ActionTaxonomy: Classification of action types (MODIFY, EXECUTE, etc.)
//! - ActionResult: Result of action validation
//! - ApprovalWorkflow: Human-in-the-loop approval for sensitive actions
//! - AuditLog: Immutable record of all actions taken

mod taxonomy;
mod validation;
mod approval;
mod audit;
mod domains;

pub use taxonomy::*;
pub use validation::*;
pub use approval::*;
pub use audit::*;
pub use domains::*;

use serde::{Deserialize, Serialize};

/// Core action types in the taxonomy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ActionType {
    /// Modify existing state (files, data, config)
    Modify,
    /// Execute code, commands, scripts
    Execute,
    /// Communicate with external entities (APIs, users, services)
    Communicate,
    /// Transfer value (money, tokens, assets, credentials)
    Transfer,
    /// Observe/read without side effects
    Observe,
    /// Create new state (files, resources)
    Create,
    /// Delete/remove state
    Delete,
}

impl ActionType {
    /// Get risk level for this action type (1-5, 5 being highest)
    pub fn risk_level(&self) -> u8 {
        match self {
            ActionType::Observe => 1,
            ActionType::Create => 2,
            ActionType::Modify => 3,
            ActionType::Communicate => 3,
            ActionType::Execute => 4,
            ActionType::Delete => 4,
            ActionType::Transfer => 5,
        }
    }

    /// Does this action type have side effects?
    pub fn has_side_effects(&self) -> bool {
        !matches!(self, ActionType::Observe)
    }

    /// Does this action type require approval by default?
    pub fn requires_approval_by_default(&self) -> bool {
        matches!(self, ActionType::Execute | ActionType::Transfer | ActionType::Delete)
    }
}

/// Information flow direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FlowDirection {
    /// Information coming into the agent
    Inbound,
    /// Information going out from the agent
    Outbound,
    /// Bidirectional flow
    Bidirectional,
}

/// Domain identifier for action classification
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DomainId(pub String);

impl DomainId {
    pub fn new(id: impl Into<String>) -> Self {
        DomainId(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Default for DomainId {
    fn default() -> Self {
        DomainId("general".to_string())
    }
}

/// Classified action with full context
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ClassifiedAction {
    /// Unique action identifier
    pub id: String,

    /// What type of action
    pub action_type: String,

    /// Domain this action affects
    pub domain: String,

    /// Specific operation being performed
    pub operation: String,

    /// Target of the action
    pub target: Option<String>,

    /// Information flow direction
    pub flow_direction: String,

    /// Risk level (1-5)
    pub risk_level: f64,

    /// Whether this action has side effects
    pub has_side_effects: bool,

    /// Whether approval is required
    pub requires_approval: bool,

    /// Reasoning provided by agent
    pub reasoning: Option<String>,

    /// Timestamp when action was classified
    pub timestamp: f64,

    /// Additional metadata (JSON string)
    pub metadata: Option<String>,
}

/// Result of action validation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ActionValidationResult {
    /// Whether the action is allowed
    pub allowed: bool,

    /// Classification of the action
    pub classification: Option<ClassifiedAction>,

    /// Why the action was allowed/blocked
    pub reason: String,

    /// If blocked, what policy was violated
    pub violated_policy: Option<String>,

    /// If approval is needed before execution
    pub approval_required: bool,

    /// Approval token if granted
    pub approval_token: Option<String>,

    /// Suggested alternatives if blocked
    pub alternatives: Vec<String>,

    /// Confidence in this decision (0.0-1.0)
    pub confidence: f64,
}

/// Policy rule for action control
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ActionPolicy {
    /// Policy identifier
    pub id: String,

    /// Human-readable description
    pub description: String,

    /// Action types this policy applies to (empty = all)
    pub action_types: Vec<String>,

    /// Domains this policy applies to (empty = all)
    pub domains: Vec<String>,

    /// Operations this policy applies to (empty = all, supports wildcards)
    pub operations: Vec<String>,

    /// Effect: "allow", "deny", "require_approval"
    pub effect: String,

    /// Priority (higher = evaluated first)
    pub priority: f64,

    /// Conditions for this policy to apply (JSON string)
    pub conditions: Option<String>,

    /// Whether this policy is enabled
    pub enabled: bool,
}

/// Action context for validation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ActionContextForValidation {
    /// Action type
    pub action_type: String,

    /// Domain
    pub domain: String,

    /// Operation
    pub operation: String,

    /// Target
    pub target: Option<String>,

    /// Parameters (JSON string)
    pub params: Option<String>,

    /// Agent reasoning
    pub reasoning: Option<String>,

    /// Session ID for tracking
    pub session_id: Option<String>,

    /// Parent action ID if this is a sub-action
    pub parent_action_id: Option<String>,
}
