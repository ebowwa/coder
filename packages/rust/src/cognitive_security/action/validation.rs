//! Action Validation Logic
//!
//! Validates actions against intent, policies, and constraints.
//! Determines whether actions should be allowed, blocked, or require approval.

use super::{
    ActionContextForValidation, ActionValidationResult, ActionPolicy,
    ClassifiedAction, classify_operation,
};
use crate::cognitive_security::intent::{
    AgentIntent, AlignmentResult, score_alignment,
};

/// Action validator that checks actions against policies and intent
pub struct ActionValidator {
    /// Active policies
    policies: Vec<ActionPolicy>,

    /// Intent to validate against
    intent: Option<AgentIntent>,

    /// Minimum alignment score required (0.0-1.0)
    min_alignment_threshold: f64,

    /// Whether to require approval for high-risk actions
    require_approval_high_risk: bool,

    /// High risk threshold (1-5)
    high_risk_threshold: f64,
}

impl Default for ActionValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionValidator {
    pub fn new() -> Self {
        ActionValidator {
            policies: Vec::new(),
            intent: None,
            min_alignment_threshold: 0.5,
            require_approval_high_risk: true,
            high_risk_threshold: 4.0,
        }
    }

    /// Set the intent to validate against
    pub fn with_intent(mut self, intent: AgentIntent) -> Self {
        self.intent = Some(intent);
        self
    }

    /// Set minimum alignment threshold
    pub fn with_min_alignment(mut self, threshold: f64) -> Self {
        self.min_alignment_threshold = threshold.clamp(0.0, 1.0);
        self
    }

    /// Add a policy
    pub fn add_policy(&mut self, policy: ActionPolicy) {
        // Insert in priority order
        let pos = self.policies.iter()
            .position(|p| p.priority < policy.priority)
            .unwrap_or(self.policies.len());
        self.policies.insert(pos, policy);
    }

    /// Remove a policy by ID
    pub fn remove_policy(&mut self, policy_id: &str) -> bool {
        let len = self.policies.len();
        self.policies.retain(|p| p.id != policy_id);
        self.policies.len() < len
    }

    /// Validate an action
    pub fn validate(&self, context: &ActionContextForValidation) -> ActionValidationResult {
        // Step 1: Classify the action
        let classification = classify_operation(
            context.operation.clone(),
            context.domain.clone(),
            context.target.clone(),
            context.reasoning.clone(),
        );

        // Step 2: Check explicit policies
        let policy_result = self.check_policies(context, &classification);
        if let Some(result) = policy_result {
            return result;
        }

        // Step 3: Check intent alignment if intent is set
        if let Some(intent) = &self.intent {
            let alignment = self.check_alignment(context, intent);

            if alignment.should_block {
                return ActionValidationResult {
                    allowed: false,
                    classification: Some(classification.clone()),
                    reason: format!("Action blocked by intent: {}", alignment.reasoning),
                    violated_policy: Some("intent_misalignment".to_string()),
                    approval_required: false,
                    approval_token: None,
                    alternatives: self.suggest_alternatives(context, &classification),
                    confidence: alignment.confidence,
                };
            }

            if alignment.score < self.min_alignment_threshold {
                return ActionValidationResult {
                    allowed: false,
                    classification: Some(classification.clone()),
                    reason: format!(
                        "Alignment score {:.2} below threshold {:.2}",
                        alignment.score, self.min_alignment_threshold
                    ),
                    violated_policy: Some("low_alignment".to_string()),
                    approval_required: true,
                    approval_token: None,
                    alternatives: self.suggest_alternatives(context, &classification),
                    confidence: alignment.confidence,
                };
            }
        }

        // Step 4: Check high-risk actions
        if self.require_approval_high_risk && classification.risk_level >= self.high_risk_threshold {
            return ActionValidationResult {
                allowed: false,
                classification: Some(classification.clone()),
                reason: format!(
                    "High-risk action (level {}) requires approval",
                    classification.risk_level
                ),
                violated_policy: None,
                approval_required: true,
                approval_token: None,
                alternatives: vec![],
                confidence: 0.9,
            };
        }

        // Action is allowed
        ActionValidationResult {
            allowed: true,
            classification: Some(classification),
            reason: "Action validated successfully".to_string(),
            violated_policy: None,
            approval_required: false,
            approval_token: None,
            alternatives: vec![],
            confidence: 1.0,
        }
    }

    /// Check action against policies
    fn check_policies(
        &self,
        context: &ActionContextForValidation,
        classification: &ClassifiedAction,
    ) -> Option<ActionValidationResult> {
        for policy in &self.policies {
            if !policy.enabled {
                continue;
            }

            if self.policy_matches(policy, context, classification) {
                let allowed = policy.effect == "allow";
                let requires_approval = policy.effect == "require_approval";

                return Some(ActionValidationResult {
                    allowed: allowed && !requires_approval,
                    classification: Some(classification.clone()),
                    reason: format!("Matched policy: {}", policy.description),
                    violated_policy: if !allowed { Some(policy.id.clone()) } else { None },
                    approval_required: requires_approval,
                    approval_token: None,
                    alternatives: if !allowed {
                        self.suggest_alternatives(context, classification)
                    } else {
                        vec![]
                    },
                    confidence: 1.0,
                });
            }
        }

        None
    }

    /// Check if a policy matches the action
    fn policy_matches(
        &self,
        policy: &ActionPolicy,
        context: &ActionContextForValidation,
        classification: &ClassifiedAction,
    ) -> bool {
        // Check action types
        if !policy.action_types.is_empty() {
            let matches_type = policy.action_types.iter().any(|t| {
                t.to_lowercase() == classification.action_type.to_lowercase()
            });
            if !matches_type {
                return false;
            }
        }

        // Check domains
        if !policy.domains.is_empty() {
            let matches_domain = policy.domains.iter().any(|d| {
                wildcard_match(d, &context.domain)
            });
            if !matches_domain {
                return false;
            }
        }

        // Check operations
        if !policy.operations.is_empty() {
            let matches_operation = policy.operations.iter().any(|o| {
                wildcard_match(o, &context.operation)
            });
            if !matches_operation {
                return false;
            }
        }

        true
    }

    /// Check action alignment with intent
    fn check_alignment(
        &self,
        context: &ActionContextForValidation,
        intent: &AgentIntent,
    ) -> AlignmentResult {
        // Convert context to intent's ActionContext
        let action_context = crate::cognitive_security::intent::ActionContext {
            action_type: context.action_type.clone(),
            domain: context.domain.clone(),
            operation: context.operation.clone(),
            target: context.target.clone(),
            params: context.params.clone(),
            reasoning: context.reasoning.clone(),
        };

        score_alignment(action_context, intent.clone())
    }

    /// Suggest alternative actions
    fn suggest_alternatives(
        &self,
        context: &ActionContextForValidation,
        classification: &ClassifiedAction,
    ) -> Vec<String> {
        let mut alternatives = Vec::new();

        // Suggest lower-risk alternatives based on action type
        match classification.action_type.as_str() {
            "delete" => {
                alternatives.push("Consider moving to archive instead of deleting".to_string());
                alternatives.push("Consider marking as inactive instead of deleting".to_string());
            }
            "execute" => {
                alternatives.push("Consider using a safer API instead of shell execution".to_string());
                alternatives.push("Consider running in a sandboxed environment".to_string());
            }
            "transfer" => {
                alternatives.push("Verify recipient identity before transfer".to_string());
                alternatives.push("Consider requiring multi-signature approval".to_string());
            }
            "modify" => {
                alternatives.push("Consider creating a backup before modification".to_string());
                alternatives.push("Consider using version control for changes".to_string());
            }
            _ => {}
        }

        // Suggest observe as a safe alternative for many actions
        if classification.has_side_effects {
            alternatives.push(
                format!("Consider using 'observe' operation to preview impact on {}", context.domain)
            );
        }

        alternatives
    }
}

/// Simple wildcard matching
fn wildcard_match(pattern: &str, text: &str) -> bool {
    let pattern_lower = pattern.to_lowercase();
    let text_lower = text.to_lowercase();

    if pattern_lower.contains('*') {
        // Simple wildcard: only supports * at start/end
        if pattern_lower.starts_with('*') && pattern_lower.ends_with('*') {
            let middle = &pattern_lower[1..pattern_lower.len()-1];
            text_lower.contains(middle)
        } else if pattern_lower.starts_with('*') {
            let suffix = &pattern_lower[1..];
            text_lower.ends_with(suffix)
        } else if pattern_lower.ends_with('*') {
            let prefix = &pattern_lower[..pattern_lower.len()-1];
            text_lower.starts_with(prefix)
        } else {
            pattern_lower == text_lower
        }
    } else {
        pattern_lower == text_lower
    }
}

/// Create a new action validator
#[napi_derive::napi]
pub fn create_action_validator() -> ActionValidatorHandle {
    ActionValidatorHandle {
        validator: ActionValidator::new(),
    }
}

/// Handle for action validator
#[napi]
pub struct ActionValidatorHandle {
    validator: ActionValidator,
}

#[napi]
impl ActionValidatorHandle {
    /// Add a policy to the validator
    #[napi]
    pub fn add_policy(&mut self, policy: ActionPolicy) {
        self.validator.add_policy(policy);
    }

    /// Remove a policy by ID
    #[napi]
    pub fn remove_policy(&mut self, policy_id: String) -> bool {
        self.validator.remove_policy(&policy_id)
    }

    /// Set the intent to validate against
    #[napi]
    pub fn set_intent(&mut self, intent: AgentIntent) {
        self.validator.intent = Some(intent);
    }

    /// Set minimum alignment threshold
    #[napi]
    pub fn set_min_alignment(&mut self, threshold: f64) {
        self.validator.min_alignment_threshold = threshold.clamp(0.0, 1.0);
    }

    /// Validate an action
    #[napi]
    pub fn validate(&self, context: ActionContextForValidation) -> ActionValidationResult {
        self.validator.validate(&context)
    }

    /// Quick check if an action is allowed
    #[napi]
    pub fn is_allowed(&self, context: ActionContextForValidation) -> bool {
        self.validator.validate(&context).allowed
    }
}

/// Validate an action against an intent
#[napi_derive::napi]
pub fn validate_action_against_intent(
    context: ActionContextForValidation,
    intent: AgentIntent,
) -> ActionValidationResult {
    let validator = ActionValidator::new().with_intent(intent);
    validator.validate(&context)
}

/// Create a default deny-all policy
#[napi_derive::napi]
pub fn create_deny_all_policy() -> ActionPolicy {
    ActionPolicy {
        id: "deny-all".to_string(),
        description: "Deny all actions by default".to_string(),
        action_types: vec![],
        domains: vec![],
        operations: vec![],
        effect: "deny".to_string(),
        priority: 0.0,
        conditions: None,
        enabled: true,
    }
}

/// Create a policy to allow observe-only actions
#[napi_derive::napi]
pub fn create_observe_only_policy() -> ActionPolicy {
    ActionPolicy {
        id: "observe-only".to_string(),
        description: "Only allow observe-type actions".to_string(),
        action_types: vec!["observe".to_string()],
        domains: vec![],
        operations: vec![],
        effect: "allow".to_string(),
        priority: 100.0,
        conditions: None,
        enabled: true,
    }
}

/// Create a policy requiring approval for transfers
#[napi_derive::napi]
pub fn create_transfer_approval_policy() -> ActionPolicy {
    ActionPolicy {
        id: "transfer-approval".to_string(),
        description: "Require approval for all transfer actions".to_string(),
        action_types: vec!["transfer".to_string()],
        domains: vec![],
        operations: vec![],
        effect: "require_approval".to_string(),
        priority: 200.0,
        conditions: None,
        enabled: true,
    }
}
