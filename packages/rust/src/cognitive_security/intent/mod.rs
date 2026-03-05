//! Intent Preservation Module
//!
//! Core module for defining, signing, and verifying agent intent.
//! The intent captures WHO the agent is, WHAT it's for, and HOW it should behave.
//!
//! Key concepts:
//! - AgentIntent: The signed declaration of agent purpose and constraints
//! - AlignmentScore: How well an action serves the intent
//! - Integrity verification via Ed25519 signatures

mod directives;
mod alignment;
mod corruption;
mod signing;

pub use directives::*;
pub use alignment::*;
pub use corruption::*;
pub use signing::*;

use serde::{Deserialize, Serialize};
use napi_derive::napi;

/// The core identity and purpose of an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AgentIntent {
    /// Unique identifier for this intent version
    pub id: String,

    /// Version number for tracking changes
    pub version: u32,

    /// Who is this agent?
    pub identity: AgentIdentity,

    /// What is it for?
    pub purpose: AgentPurpose,

    /// How should it behave?
    pub principles: AgentPrinciples,

    /// Ed25519 signature proving authenticity
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,

    /// Timestamp of creation (Unix timestamp as f64 for napi compatibility)
    pub created_at: f64,

    /// Public key that signed this intent (hex)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AgentIdentity {
    /// Human-readable name
    pub name: String,

    /// What kind of agent this is
    pub description: String,

    /// What this agent can do
    pub capabilities: Vec<String>,

    /// What this agent explicitly cannot do
    pub constraints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AgentPurpose {
    /// What it's trying to achieve
    pub goals: Vec<Goal>,

    /// What it explicitly should NOT pursue
    #[serde(default)]
    pub non_goals: Vec<String>,

    /// Hard limits that should never be crossed
    #[serde(default)]
    pub boundaries: Vec<Boundary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AgentPrinciples {
    /// Guiding values for decision making
    #[serde(default)]
    pub values: Vec<String>,

    /// What matters most (ordered by importance)
    #[serde(default)]
    pub priorities: Vec<String>,

    /// Never under any circumstances
    #[serde(default)]
    pub forbidden: Vec<String>,
}

/// A specific goal the agent pursues
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct Goal {
    /// Unique identifier
    pub id: String,

    /// Human-readable description
    pub description: String,

    /// How important is this goal?
    #[serde(default)]
    pub priority: String, // "critical" | "high" | "medium" | "low"

    /// Can we measure success?
    #[serde(default)]
    pub measurable: bool,

    /// How do we know it's achieved?
    #[serde(skip_serializing_if = "Option::is_none")]
    pub success_criteria: Option<String>,
}

/// A hard boundary the agent must respect
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct Boundary {
    /// Unique identifier
    pub id: String,

    /// Human-readable description
    pub description: String,

    /// How strictly to enforce
    #[serde(default)]
    pub enforcement: String, // "never" | "require_approval" | "log_only"

    /// Domain this applies to (e.g., "code", "network", "wallet")
    pub domain: String,

    /// Pattern to match actions against
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
}

/// Result of checking if an action aligns with intent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AlignmentResult {
    /// Overall alignment score (0.0 = against intent, 1.0 = fully aligned)
    pub score: f64,

    /// Human-readable explanation
    pub reasoning: String,

    /// Goals this action serves (goal IDs)
    pub serves_goals: Vec<String>,

    /// Goals this action might hinder
    pub hinders_goals: Vec<String>,

    /// Boundaries this action might violate
    pub boundary_concerns: Vec<String>,

    /// How confident are we in this assessment
    pub confidence: f64,

    /// Should this action be blocked?
    pub should_block: bool,

    /// Does this require human review?
    pub requires_review: bool,
}

/// Action to evaluate against intent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ActionContext {
    /// Type of action (e.g., "modify", "execute", "communicate")
    pub action_type: String,

    /// Domain (e.g., "code", "network", "file")
    pub domain: String,

    /// Specific operation
    pub operation: String,

    /// What it affects
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,

    /// Additional parameters (JSON string for napi compatibility)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<String>,

    /// Why the agent wants to do this
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,
}

/// Result of verifying intent integrity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct IntegrityResult {
    /// Is the intent valid and authentic?
    pub valid: bool,

    /// What went wrong (if invalid)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,

    /// Was the signature valid?
    pub signature_valid: bool,

    /// Does the content match the signature?
    pub content_intact: bool,

    /// Is this intent expired? (if expiry set)
    pub expired: bool,
}
