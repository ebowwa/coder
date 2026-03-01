//! Cognitive Security Module
//!
//! Provides intent preservation, action validation, and behavioral analysis
//! for autonomous AI agents running in untrusted environments.
//!
//! Based on Palantir AIP and NIST AI RMF 2.0 / AAGATE principles:
//! - Immutable directives outside AI context
//! - Cryptographic action signing
//! - Behavioral drift detection
//! - Approval escalation for high-risk operations

pub mod action;
pub mod flow;
pub mod intent;
pub mod immutable;
pub mod signed_action;
pub mod drift;

// Re-export key types
pub use immutable::*;
pub use signed_action::*;
pub use drift::*;
