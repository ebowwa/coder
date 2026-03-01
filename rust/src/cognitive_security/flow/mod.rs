//! Information Flow Control Module
//!
//! Tracks and controls the flow of information through the agent.
//! Implements data classification, sensitivity levels, and leak prevention.
//!
//! Key concepts:
//! - DataClassification: Sensitivity levels for data (PUBLIC, INTERNAL, CONFIDENTIAL, SECRET)
//! - FlowPolicy: Rules governing information flow between domains
//! - FlowTracker: Monitors data movement through the system
//! - LeakPrevention: Detects and blocks potential data exfiltration

mod classification;
mod policies;
mod tracking;
mod prevention;
mod taint;

pub use classification::*;
pub use policies::*;
pub use tracking::*;
pub use prevention::*;
pub use taint::*;

use serde::{Deserialize, Serialize};

/// Sensitivity level for data classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SensitivityLevel {
    /// Public information, no restrictions
    Public = 0,
    /// Internal use, shouldn't leave organization
    Internal = 1,
    /// Confidential, need-to-know basis
    Confidential = 2,
    /// Secret, highly restricted
    Secret = 3,
    /// Top secret, maximum restriction
    TopSecret = 4,
}

impl Default for SensitivityLevel {
    fn default() -> Self {
        SensitivityLevel::Internal
    }
}

impl SensitivityLevel {
    /// Get human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            SensitivityLevel::Public => "PUBLIC",
            SensitivityLevel::Internal => "INTERNAL",
            SensitivityLevel::Confidential => "CONFIDENTIAL",
            SensitivityLevel::Secret => "SECRET",
            SensitivityLevel::TopSecret => "TOP_SECRET",
        }
    }

    /// Can data at this level flow to the target level?
    pub fn can_flow_to(&self, target: SensitivityLevel) -> bool {
        // Data can only flow to equal or higher sensitivity levels
        // (no downgrading)
        self <= &target
    }

    /// Get numeric value for comparison
    pub fn value(&self) -> u8 {
        *self as u8
    }
}

/// Data category for classification
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataCategory {
    /// Personal identifiable information
    Pii,
    /// Financial data
    Financial,
    /// Authentication credentials
    Credentials,
    /// API keys and secrets
    Secrets,
    /// Source code
    SourceCode,
    /// Configuration data
    Configuration,
    /// Logs and telemetry
    Logs,
    /// User content
    UserContent,
    /// System data
    SystemData,
    /// Network data
    NetworkData,
    /// Generic/uncategorized
    Generic,
}

impl Default for DataCategory {
    fn default() -> Self {
        DataCategory::Generic
    }
}

/// Classified data item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ClassifiedData {
    /// Unique identifier
    pub id: String,

    /// Sensitivity level
    pub sensitivity: String,

    /// Data category
    pub category: String,

    /// Source of the data
    pub source: String,

    /// Tags for additional classification
    pub tags: Vec<String>,

    /// Whether this data can be logged
    pub can_log: bool,

    /// Whether this data can be transmitted
    pub can_transmit: bool,

    /// Whether this data can be stored
    pub can_store: bool,

    /// Expiration timestamp (if applicable)
    pub expires_at: Option<f64>,

    /// Creation timestamp
    pub created_at: f64,
}

/// Information flow record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FlowRecord {
    /// Unique flow ID
    pub id: String,

    /// Data being flowed
    pub data_id: String,

    /// Source domain
    pub source_domain: String,

    /// Target domain
    pub target_domain: String,

    /// Flow direction
    pub direction: String,

    /// Whether flow was allowed
    pub allowed: bool,

    /// Reason for allow/deny
    pub reason: String,

    /// Policy that governed this flow (if any)
    pub policy_id: Option<String>,

    /// Session ID
    pub session_id: Option<String>,

    /// Action that triggered this flow
    pub action_id: Option<String>,

    /// Timestamp
    pub timestamp: f64,

    /// Data hash (for tracking without exposing)
    pub data_hash: String,
}

/// Flow validation request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FlowValidationRequest {
    /// Data to flow
    pub data: ClassifiedData,

    /// Source domain
    pub source_domain: String,

    /// Target domain
    pub target_domain: String,

    /// Flow direction
    pub direction: String,

    /// Purpose of the flow
    pub purpose: Option<String>,

    /// Session ID
    pub session_id: Option<String>,

    /// Action ID
    pub action_id: Option<String>,
}

/// Flow validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FlowValidationResult {
    /// Whether the flow is allowed
    pub allowed: bool,

    /// Reason for the decision
    pub reason: String,

    /// Policy that was applied (if any)
    pub applied_policy: Option<String>,

    /// Whether logging is permitted
    pub can_log: bool,

    /// Whether transmission is permitted
    pub can_transmit: bool,

    /// Whether storage is permitted
    pub can_store: bool,

    /// Required transformations (e.g., redaction)
    pub transformations: Vec<String>,

    /// Confidence in this decision
    pub confidence: f64,

    /// Warnings about this flow
    pub warnings: Vec<String>,
}

/// Domain boundary for flow control
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DomainBoundary {
    /// Domain identifier
    pub domain: String,

    /// Maximum sensitivity level allowed
    pub max_sensitivity: String,

    /// Allowed source domains
    pub allowed_sources: Vec<String>,

    /// Allowed target domains
    pub allowed_targets: Vec<String>,

    /// Whether this domain can receive external data
    pub can_receive_external: bool,

    /// Whether this domain can send external data
    pub can_send_external: bool,

    /// Required transformations for inbound data
    pub inbound_transforms: Vec<String>,

    /// Required transformations for outbound data
    pub outbound_transforms: Vec<String>,
}
