//! Flow Policies
//!
//! Defines rules governing information flow between domains.
//! Implements the Bell-LaPadula model (no read up, no write down)
//! with extensions for modern data handling requirements.

use super::{SensitivityLevel, ClassifiedData, FlowValidationResult};
use serde::{Deserialize, Serialize};

/// Flow policy rule
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FlowPolicy {
    /// Policy identifier
    pub id: String,

    /// Human-readable description
    pub description: String,

    /// Source domain pattern (supports wildcards)
    pub source_pattern: String,

    /// Target domain pattern (supports wildcards)
    pub target_pattern: String,

    /// Required minimum source sensitivity
    pub min_source_sensitivity: Option<String>,

    /// Required maximum target sensitivity
    pub max_target_sensitivity: Option<String>,

    /// Categories this policy applies to (empty = all)
    pub categories: Vec<String>,

    /// Effect: "allow", "deny", "transform", "audit_only"
    pub effect: String,

    /// Priority (higher = evaluated first)
    pub priority: f64,

    /// Required transformations (for "transform" effect)
    pub required_transforms: Vec<String>,

    /// Whether to log this flow
    pub log_flow: bool,

    /// Whether to require approval
    pub require_approval: bool,

    /// Conditions (JSON string)
    pub conditions: Option<String>,

    /// Whether this policy is enabled
    pub enabled: bool,
}

/// Flow policy engine
pub struct FlowPolicyEngine {
    /// Policies ordered by priority
    policies: Vec<FlowPolicy>,

    /// Default action when no policy matches
    default_action: DefaultFlowAction,

    /// Bell-LaPadula enforcement mode
    blp_mode: BlpEnforcementMode,
}

/// Default action for unmatched flows
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DefaultFlowAction {
    /// Allow by default
    Allow,
    /// Deny by default
    Deny,
    /// Audit only (allow but log)
    AuditOnly,
}

/// Bell-LaPadula enforcement mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlpEnforcementMode {
    /// No BLP enforcement
    Disabled,
    /// Simple Security Property (no read up)
    NoReadUp,
    /// Star Property (no write down)
    NoWriteDown,
    /// Both properties enforced
    Full,
}

impl Default for FlowPolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl FlowPolicyEngine {
    pub fn new() -> Self {
        let mut engine = FlowPolicyEngine {
            policies: Vec::new(),
            // Use AuditOnly for development - allows operations but logs them
            // Change to Deny for production deployment
            default_action: DefaultFlowAction::AuditOnly,
            blp_mode: BlpEnforcementMode::Full,
        };

        engine.register_default_policies();
        engine
    }

    fn register_default_policies(&mut self) {
        // Allow observe operations on public data
        self.add_policy(FlowPolicy {
            id: "allow_public_observe".to_string(),
            description: "Allow observation of public data".to_string(),
            source_pattern: "*".to_string(),
            target_pattern: "agent".to_string(),
            min_source_sensitivity: Some("public".to_string()),
            max_target_sensitivity: None,
            categories: vec![],
            effect: "allow".to_string(),
            priority: 100.0,
            required_transforms: vec![],
            log_flow: true,
            require_approval: false,
            conditions: None,
            enabled: true,
        });

        // Deny secret data from leaving
        self.add_policy(FlowPolicy {
            id: "deny_secret_egress".to_string(),
            description: "Deny secret data from leaving secure domains".to_string(),
            source_pattern: "vault|secrets|credentials".to_string(),
            target_pattern: "external|network|api".to_string(),
            min_source_sensitivity: None,
            max_target_sensitivity: None,
            categories: vec!["credentials".to_string(), "secrets".to_string()],
            effect: "deny".to_string(),
            priority: 500.0,
            required_transforms: vec![],
            log_flow: true,
            require_approval: false,
            conditions: None,
            enabled: true,
        });

        // Require transformation for internal to external
        self.add_policy(FlowPolicy {
            id: "transform_internal_external".to_string(),
            description: "Transform internal data when sending externally".to_string(),
            source_pattern: "*".to_string(),
            target_pattern: "external|network|api".to_string(),
            min_source_sensitivity: Some("internal".to_string()),
            max_target_sensitivity: None,
            categories: vec![],
            effect: "transform".to_string(),
            priority: 200.0,
            required_transforms: vec!["redact_pii".to_string(), "strip_metadata".to_string()],
            log_flow: true,
            require_approval: false,
            conditions: None,
            enabled: true,
        });

        // Audit all credential flows
        self.add_policy(FlowPolicy {
            id: "audit_credentials".to_string(),
            description: "Audit all credential data flows".to_string(),
            source_pattern: "*".to_string(),
            target_pattern: "*".to_string(),
            min_source_sensitivity: None,
            max_target_sensitivity: None,
            categories: vec!["credentials".to_string()],
            effect: "audit_only".to_string(),
            priority: 150.0,
            required_transforms: vec![],
            log_flow: true,
            require_approval: true,
            conditions: None,
            enabled: true,
        });

        // Allow internal flows
        self.add_policy(FlowPolicy {
            id: "allow_internal".to_string(),
            description: "Allow flows within internal domains".to_string(),
            source_pattern: "internal|agent|code".to_string(),
            target_pattern: "internal|agent|code".to_string(),
            min_source_sensitivity: None,
            max_target_sensitivity: None,
            categories: vec![],
            effect: "allow".to_string(),
            priority: 50.0,
            required_transforms: vec![],
            log_flow: false,
            require_approval: false,
            conditions: None,
            enabled: true,
        });
    }

    /// Add a policy (inserts in priority order)
    pub fn add_policy(&mut self, policy: FlowPolicy) {
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

    /// Set default action
    pub fn set_default_action(&mut self, action: DefaultFlowAction) {
        self.default_action = action;
    }

    /// Set BLP enforcement mode
    pub fn set_blp_mode(&mut self, mode: BlpEnforcementMode) {
        self.blp_mode = mode;
    }

    /// Evaluate flow against all policies
    pub fn evaluate(
        &self,
        data: &ClassifiedData,
        source_domain: &str,
        target_domain: &str,
    ) -> FlowValidationResult {
        // Step 1: Check Bell-LaPadula properties
        let blp_result = self.check_blp(data, source_domain, target_domain);
        if !blp_result.allowed {
            return blp_result;
        }

        // Step 2: Find matching policy
        for policy in &self.policies {
            if !policy.enabled {
                continue;
            }

            if self.policy_matches(policy, data, source_domain, target_domain) {
                return self.apply_policy(policy, data);
            }
        }

        // Step 3: Apply default action
        self.apply_default_action(data)
    }

    /// Check Bell-LaPadula properties
    fn check_blp(
        &self,
        data: &ClassifiedData,
        source_domain: &str,
        target_domain: &str,
    ) -> FlowValidationResult {
        let data_sensitivity = SensitivityLevel::from(data.sensitivity.as_str());

        // Check if this is a read (inbound to agent) or write (outbound from agent)
        let is_read = target_domain == "agent" || target_domain == "internal";
        let is_write = source_domain == "agent" || source_domain == "internal";

        match self.blp_mode {
            BlpEnforcementMode::NoReadUp if is_read => {
                // Cannot read data at higher sensitivity
                // (agent can only read data at or below its clearance)
                // Assuming agent clearance is Internal for now
                if data_sensitivity > SensitivityLevel::Internal {
                    return FlowValidationResult {
                        allowed: false,
                        reason: format!(
                            "BLP violation: Cannot read {} data (agent clearance exceeded)",
                            data.sensitivity
                        ),
                        applied_policy: Some("blp_no_read_up".to_string()),
                        can_log: false,
                        can_transmit: false,
                        can_store: false,
                        transformations: vec![],
                        confidence: 1.0,
                        warnings: vec![],
                    };
                }
            }
            BlpEnforcementMode::NoWriteDown if is_write => {
                // Cannot write data to lower sensitivity
                if data_sensitivity > SensitivityLevel::Public {
                    // Check if target is external/public
                    if target_domain.contains("external")
                        || target_domain.contains("public")
                        || target_domain.contains("api")
                    {
                        return FlowValidationResult {
                            allowed: false,
                            reason: format!(
                                "BLP violation: Cannot write {} data to lower-sensitivity domain",
                                data.sensitivity
                            ),
                            applied_policy: Some("blp_no_write_down".to_string()),
                            can_log: false,
                            can_transmit: false,
                            can_store: false,
                            transformations: vec![],
                            confidence: 1.0,
                            warnings: vec![],
                        };
                    }
                }
            }
            BlpEnforcementMode::Full => {
                // Both checks
                if is_read && data_sensitivity > SensitivityLevel::Internal {
                    return FlowValidationResult {
                        allowed: false,
                        reason: format!(
                            "BLP violation: Cannot read {} data",
                            data.sensitivity
                        ),
                        applied_policy: Some("blp_full".to_string()),
                        can_log: false,
                        can_transmit: false,
                        can_store: false,
                        transformations: vec![],
                        confidence: 1.0,
                        warnings: vec![],
                    };
                }
                if is_write && data_sensitivity > SensitivityLevel::Public
                    && (target_domain.contains("external") || target_domain.contains("api"))
                {
                    return FlowValidationResult {
                        allowed: false,
                        reason: format!(
                            "BLP violation: Cannot write {} data externally",
                            data.sensitivity
                        ),
                        applied_policy: Some("blp_full".to_string()),
                        can_log: false,
                        can_transmit: false,
                        can_store: false,
                        transformations: vec![],
                        confidence: 1.0,
                        warnings: vec![],
                    };
                }
            }
            BlpEnforcementMode::Disabled => {}
            // Handle NoReadUp when not reading, and NoWriteDown when not writing
            BlpEnforcementMode::NoReadUp | BlpEnforcementMode::NoWriteDown => {}
        }

        FlowValidationResult {
            allowed: true,
            reason: "BLP check passed".to_string(),
            applied_policy: None,
            can_log: true,
            can_transmit: true,
            can_store: true,
            transformations: vec![],
            confidence: 1.0,
            warnings: vec![],
        }
    }

    /// Check if a policy matches the flow
    fn policy_matches(
        &self,
        policy: &FlowPolicy,
        data: &ClassifiedData,
        source_domain: &str,
        target_domain: &str,
    ) -> bool {
        // Check source pattern
        if !wildcard_match(&policy.source_pattern, source_domain) {
            return false;
        }

        // Check target pattern
        if !wildcard_match(&policy.target_pattern, target_domain) {
            return false;
        }

        // Check source sensitivity
        if let Some(ref min_sens) = policy.min_source_sensitivity {
            let required = SensitivityLevel::from(min_sens.as_str());
            let actual = SensitivityLevel::from(data.sensitivity.as_str());
            if actual < required {
                return false;
            }
        }

        // Check target sensitivity
        if let Some(ref max_sens) = policy.max_target_sensitivity {
            let required = SensitivityLevel::from(max_sens.as_str());
            let actual = SensitivityLevel::from(data.sensitivity.as_str());
            if actual > required {
                return false;
            }
        }

        // Check categories
        if !policy.categories.is_empty() {
            let matches_category = policy.categories.iter().any(|c| {
                c.to_lowercase() == data.category.to_lowercase()
            });
            if !matches_category {
                return false;
            }
        }

        true
    }

    /// Apply a matched policy
    fn apply_policy(&self, policy: &FlowPolicy, _data: &ClassifiedData) -> FlowValidationResult {
        match policy.effect.as_str() {
            "allow" => FlowValidationResult {
                allowed: true,
                reason: format!("Allowed by policy: {}", policy.description),
                applied_policy: Some(policy.id.clone()),
                can_log: policy.log_flow,
                can_transmit: true,
                can_store: true,
                transformations: vec![],
                confidence: 1.0,
                warnings: if policy.require_approval {
                    vec!["Approval recommended for this flow".to_string()]
                } else {
                    vec![]
                },
            },
            "deny" => FlowValidationResult {
                allowed: false,
                reason: format!("Denied by policy: {}", policy.description),
                applied_policy: Some(policy.id.clone()),
                can_log: policy.log_flow,
                can_transmit: false,
                can_store: false,
                transformations: vec![],
                confidence: 1.0,
                warnings: vec![],
            },
            "transform" => FlowValidationResult {
                allowed: true,
                reason: format!("Allowed with transformation: {}", policy.description),
                applied_policy: Some(policy.id.clone()),
                can_log: policy.log_flow,
                can_transmit: true,
                can_store: true,
                transformations: policy.required_transforms.clone(),
                confidence: 1.0,
                warnings: if policy.require_approval {
                    vec!["Approval recommended for this flow".to_string()]
                } else {
                    vec![]
                },
            },
            "audit_only" => FlowValidationResult {
                allowed: true,
                reason: format!("Allowed with audit: {}", policy.description),
                applied_policy: Some(policy.id.clone()),
                can_log: true,
                can_transmit: true,
                can_store: true,
                transformations: vec![],
                confidence: 1.0,
                warnings: vec!["This flow is being audited".to_string()],
            },
            _ => FlowValidationResult {
                allowed: false,
                reason: "Unknown policy effect".to_string(),
                applied_policy: Some(policy.id.clone()),
                can_log: false,
                can_transmit: false,
                can_store: false,
                transformations: vec![],
                confidence: 0.5,
                warnings: vec![],
            },
        }
    }

    /// Apply default action when no policy matches
    fn apply_default_action(&self, _data: &ClassifiedData) -> FlowValidationResult {
        match self.default_action {
            DefaultFlowAction::Allow => FlowValidationResult {
                allowed: true,
                reason: "Allowed by default".to_string(),
                applied_policy: None,
                can_log: true,
                can_transmit: true,
                can_store: true,
                transformations: vec![],
                confidence: 0.5,
                warnings: vec!["No matching policy, using default allow".to_string()],
            },
            DefaultFlowAction::Deny => FlowValidationResult {
                allowed: false,
                reason: "Denied by default (no matching policy)".to_string(),
                applied_policy: None,
                can_log: false,
                can_transmit: false,
                can_store: false,
                transformations: vec![],
                confidence: 0.5,
                warnings: vec![],
            },
            DefaultFlowAction::AuditOnly => FlowValidationResult {
                allowed: true,
                reason: "Allowed with audit by default".to_string(),
                applied_policy: None,
                can_log: true,
                can_transmit: true,
                can_store: true,
                transformations: vec![],
                confidence: 0.5,
                warnings: vec!["No matching policy, auditing flow".to_string()],
            },
        }
    }

    /// Get all policies
    pub fn list_policies(&self) -> &[FlowPolicy] {
        &self.policies
    }
}

impl From<&str> for SensitivityLevel {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "public" => SensitivityLevel::Public,
            "internal" => SensitivityLevel::Internal,
            "confidential" => SensitivityLevel::Confidential,
            "secret" => SensitivityLevel::Secret,
            "top_secret" | "topsecret" => SensitivityLevel::TopSecret,
            _ => SensitivityLevel::Internal,
        }
    }
}

/// Simple wildcard matching
fn wildcard_match(pattern: &str, text: &str) -> bool {
    let pattern_lower = pattern.to_lowercase();
    let text_lower = text.to_lowercase();

    // Handle pipe-separated alternatives
    if pattern_lower.contains('|') {
        return pattern_lower.split('|').any(|p| wildcard_match_single(p.trim(), &text_lower));
    }

    wildcard_match_single(&pattern_lower, &text_lower)
}

fn wildcard_match_single(pattern: &str, text: &str) -> bool {
    if pattern == "*" {
        return true;
    }

    if pattern.contains('*') {
        if pattern.starts_with('*') && pattern.ends_with('*') {
            let middle = &pattern[1..pattern.len()-1];
            text.contains(middle)
        } else if pattern.starts_with('*') {
            let suffix = &pattern[1..];
            text.ends_with(suffix)
        } else if pattern.ends_with('*') {
            let prefix = &pattern[..pattern.len()-1];
            text.starts_with(prefix)
        } else {
            pattern == text
        }
    } else {
        pattern == text
    }
}

/// Create a new flow policy engine
#[napi_derive::napi]
pub fn create_flow_policy_engine() -> FlowPolicyEngineHandle {
    FlowPolicyEngineHandle {
        engine: FlowPolicyEngine::new(),
    }
}

/// Handle for flow policy engine
#[napi]
pub struct FlowPolicyEngineHandle {
    engine: FlowPolicyEngine,
}

#[napi]
impl FlowPolicyEngineHandle {
    /// Add a policy
    #[napi]
    pub fn add_policy(&mut self, policy: FlowPolicy) {
        self.engine.add_policy(policy);
    }

    /// Remove a policy
    #[napi]
    pub fn remove_policy(&mut self, policy_id: String) -> bool {
        self.engine.remove_policy(&policy_id)
    }

    /// Evaluate a flow
    #[napi]
    pub fn evaluate(
        &self,
        data: ClassifiedData,
        source_domain: String,
        target_domain: String,
    ) -> FlowValidationResult {
        self.engine.evaluate(&data, &source_domain, &target_domain)
    }

    /// List all policies
    #[napi]
    pub fn list_policies(&self) -> Vec<FlowPolicy> {
        self.engine.list_policies().to_vec()
    }

    /// Set default action
    #[napi]
    pub fn set_default_action(&mut self, action: String) {
        let default_action = match action.to_lowercase().as_str() {
            "allow" => DefaultFlowAction::Allow,
            "audit" | "audit_only" => DefaultFlowAction::AuditOnly,
            _ => DefaultFlowAction::Deny,
        };
        self.engine.set_default_action(default_action);
    }

    /// Set BLP enforcement mode
    #[napi]
    pub fn set_blp_mode(&mut self, mode: String) {
        let blp_mode = match mode.to_lowercase().as_str() {
            "disabled" => BlpEnforcementMode::Disabled,
            "no_read_up" => BlpEnforcementMode::NoReadUp,
            "no_write_down" => BlpEnforcementMode::NoWriteDown,
            _ => BlpEnforcementMode::Full,
        };
        self.engine.set_blp_mode(blp_mode);
    }
}

/// Create a default allow-all policy
#[napi_derive::napi]
pub fn create_allow_all_flow_policy() -> FlowPolicy {
    FlowPolicy {
        id: "allow_all".to_string(),
        description: "Allow all flows".to_string(),
        source_pattern: "*".to_string(),
        target_pattern: "*".to_string(),
        min_source_sensitivity: None,
        max_target_sensitivity: None,
        categories: vec![],
        effect: "allow".to_string(),
        priority: 0.0,
        required_transforms: vec![],
        log_flow: false,
        require_approval: false,
        conditions: None,
        enabled: true,
    }
}

/// Create a deny-all policy
#[napi_derive::napi]
pub fn create_deny_all_flow_policy() -> FlowPolicy {
    FlowPolicy {
        id: "deny_all".to_string(),
        description: "Deny all flows by default".to_string(),
        source_pattern: "*".to_string(),
        target_pattern: "*".to_string(),
        min_source_sensitivity: None,
        max_target_sensitivity: None,
        categories: vec![],
        effect: "deny".to_string(),
        priority: 0.0,
        required_transforms: vec![],
        log_flow: false,
        require_approval: false,
        conditions: None,
        enabled: true,
    }
}

/// Create a strict security policy
#[napi_derive::napi]
pub fn create_strict_flow_policy() -> FlowPolicy {
    FlowPolicy {
        id: "strict_default".to_string(),
        description: "Strict default policy - deny unless explicitly allowed".to_string(),
        source_pattern: "*".to_string(),
        target_pattern: "*".to_string(),
        min_source_sensitivity: Some("public".to_string()),
        max_target_sensitivity: Some("internal".to_string()),
        categories: vec![],
        effect: "deny".to_string(),
        priority: 10.0,
        required_transforms: vec![],
        log_flow: true,
        require_approval: true,
        conditions: None,
        enabled: true,
    }
}
