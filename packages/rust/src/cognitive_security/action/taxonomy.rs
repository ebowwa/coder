//! Action Taxonomy and Classification
//!
//! Provides a domain-agnostic classification system for agent actions.
//! Maps raw operations to standardized action types.

use super::{ActionType, FlowDirection, ClassifiedAction};
use std::collections::HashMap;

/// Action classifier that maps operations to types
pub struct ActionClassifier {
    /// Operation patterns mapped to action types
    operation_patterns: HashMap<String, ActionType>,

    /// Domain-specific operation mappings
    domain_mappings: HashMap<String, HashMap<String, ActionType>>,

    /// Flow direction mappings
    flow_mappings: HashMap<String, FlowDirection>,
}

impl Default for ActionClassifier {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionClassifier {
    pub fn new() -> Self {
        let mut classifier = ActionClassifier {
            operation_patterns: HashMap::new(),
            domain_mappings: HashMap::new(),
            flow_mappings: HashMap::new(),
        };

        classifier.register_defaults();
        classifier
    }

    /// Register default operation patterns
    fn register_defaults(&mut self) {
        // File operations
        self.register_operation("read", ActionType::Observe);
        self.register_operation("write", ActionType::Modify);
        self.register_operation("append", ActionType::Modify);
        self.register_operation("delete", ActionType::Delete);
        self.register_operation("create", ActionType::Create);
        self.register_operation("move", ActionType::Modify);
        self.register_operation("copy", ActionType::Create);

        // Code operations
        self.register_operation("edit", ActionType::Modify);
        self.register_operation("refactor", ActionType::Modify);
        self.register_operation("format", ActionType::Modify);
        self.register_operation("lint", ActionType::Observe);
        self.register_operation("test", ActionType::Execute);
        self.register_operation("build", ActionType::Execute);
        self.register_operation("compile", ActionType::Execute);

        // Shell/execution
        self.register_operation("execute", ActionType::Execute);
        self.register_operation("run", ActionType::Execute);
        self.register_operation("spawn", ActionType::Execute);
        self.register_operation("shell", ActionType::Execute);
        self.register_operation("bash", ActionType::Execute);
        self.register_operation("command", ActionType::Execute);

        // Network/API
        self.register_operation("fetch", ActionType::Communicate);
        self.register_operation("request", ActionType::Communicate);
        self.register_operation("api_call", ActionType::Communicate);
        self.register_operation("http_get", ActionType::Observe);
        self.register_operation("http_post", ActionType::Communicate);
        self.register_operation("http_put", ActionType::Modify);
        self.register_operation("http_delete", ActionType::Delete);
        self.register_operation("websocket", ActionType::Communicate);

        // Data operations
        self.register_operation("query", ActionType::Observe);
        self.register_operation("insert", ActionType::Create);
        self.register_operation("update", ActionType::Modify);
        self.register_operation("upsert", ActionType::Modify);
        self.register_operation("select", ActionType::Observe);
        self.register_operation("aggregate", ActionType::Observe);

        // Transfer operations
        self.register_operation("send", ActionType::Transfer);
        self.register_operation("receive", ActionType::Transfer);
        self.register_operation("transfer", ActionType::Transfer);
        self.register_operation("pay", ActionType::Transfer);
        self.register_operation("withdraw", ActionType::Transfer);
        self.register_operation("deposit", ActionType::Transfer);

        // Communication
        self.register_operation("notify", ActionType::Communicate);
        self.register_operation("email", ActionType::Communicate);
        self.register_operation("message", ActionType::Communicate);
        self.register_operation("broadcast", ActionType::Communicate);
        self.register_operation("post", ActionType::Communicate);

        // Default flow directions
        self.register_flow("http_get", FlowDirection::Inbound);
        self.register_flow("http_post", FlowDirection::Outbound);
        self.register_flow("fetch", FlowDirection::Inbound);
        self.register_flow("send", FlowDirection::Outbound);
        self.register_flow("receive", FlowDirection::Inbound);
        self.register_flow("websocket", FlowDirection::Bidirectional);
        self.register_flow("read", FlowDirection::Inbound);
        self.register_flow("write", FlowDirection::Outbound);
        self.register_flow("query", FlowDirection::Inbound);
        self.register_flow("execute", FlowDirection::Outbound);
    }

    /// Register an operation pattern
    pub fn register_operation(&mut self, operation: &str, action_type: ActionType) {
        self.operation_patterns.insert(operation.to_lowercase(), action_type);
    }

    /// Register a flow direction for an operation
    pub fn register_flow(&mut self, operation: &str, direction: FlowDirection) {
        self.flow_mappings.insert(operation.to_lowercase(), direction);
    }

    /// Register domain-specific operation mapping
    pub fn register_domain_operation(
        &mut self,
        domain: &str,
        operation: &str,
        action_type: ActionType,
    ) {
        self.domain_mappings
            .entry(domain.to_lowercase())
            .or_insert_with(HashMap::new)
            .insert(operation.to_lowercase(), action_type);
    }

    /// Classify an action based on operation and domain
    pub fn classify(
        &self,
        operation: &str,
        domain: &str,
        target: Option<&str>,
        reasoning: Option<&str>,
    ) -> ClassifiedAction {
        let op_lower = operation.to_lowercase();
        let domain_lower = domain.to_lowercase();

        // Check domain-specific mapping first
        let action_type = self.domain_mappings
            .get(&domain_lower)
            .and_then(|m| m.get(&op_lower))
            .copied()
            .or_else(|| self.operation_patterns.get(&op_lower).copied())
            .unwrap_or(ActionType::Observe);

        // Determine flow direction
        let flow_direction = self.flow_mappings
            .get(&op_lower)
            .copied()
            .unwrap_or_else(|| {
                if action_type.has_side_effects() {
                    FlowDirection::Outbound
                } else {
                    FlowDirection::Inbound
                }
            });

        ClassifiedAction {
            id: generate_action_id(),
            action_type: format!("{:?}", action_type).to_lowercase(),
            domain: domain.to_string(),
            operation: operation.to_string(),
            target: target.map(|s| s.to_string()),
            flow_direction: format!("{:?}", flow_direction).to_lowercase(),
            risk_level: action_type.risk_level() as f64,
            has_side_effects: action_type.has_side_effects(),
            requires_approval: action_type.requires_approval_by_default(),
            reasoning: reasoning.map(|s| s.to_string()),
            timestamp: current_timestamp(),
            metadata: None,
        }
    }
}

fn generate_action_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("action-{:016x}", ts.as_nanos())
}

fn current_timestamp() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

/// Create a new action classifier
#[napi_derive::napi]
pub fn create_action_classifier() -> ActionClassifierHandle {
    ActionClassifierHandle {
        classifier: ActionClassifier::new(),
    }
}

/// Handle for the action classifier
#[napi]
pub struct ActionClassifierHandle {
    classifier: ActionClassifier,
}

#[napi]
impl ActionClassifierHandle {
    /// Classify an action
    #[napi]
    pub fn classify_action(
        &self,
        operation: String,
        domain: String,
        target: Option<String>,
        reasoning: Option<String>,
    ) -> ClassifiedAction {
        self.classifier.classify(
            &operation,
            &domain,
            target.as_deref(),
            reasoning.as_deref(),
        )
    }

    /// Register a custom operation mapping
    #[napi]
    pub fn register_operation(&mut self, operation: String, action_type: String) {
        let at = match action_type.to_uppercase().as_str() {
            "MODIFY" => ActionType::Modify,
            "EXECUTE" => ActionType::Execute,
            "COMMUNICATE" => ActionType::Communicate,
            "TRANSFER" => ActionType::Transfer,
            "OBSERVE" => ActionType::Observe,
            "CREATE" => ActionType::Create,
            "DELETE" => ActionType::Delete,
            _ => ActionType::Observe,
        };
        self.classifier.register_operation(&operation, at);
    }

    /// Get risk level for an action type
    #[napi]
    pub fn get_risk_level(&self, action_type: String) -> f64 {
        let at = match action_type.to_uppercase().as_str() {
            "MODIFY" => ActionType::Modify,
            "EXECUTE" => ActionType::Execute,
            "COMMUNICATE" => ActionType::Communicate,
            "TRANSFER" => ActionType::Transfer,
            "OBSERVE" => ActionType::Observe,
            "CREATE" => ActionType::Create,
            "DELETE" => ActionType::Delete,
            _ => ActionType::Observe,
        };
        at.risk_level() as f64
    }
}

/// Quick classify an operation without creating a classifier
#[napi_derive::napi]
pub fn classify_operation(
    operation: String,
    domain: String,
    target: Option<String>,
    reasoning: Option<String>,
) -> ClassifiedAction {
    let classifier = ActionClassifier::new();
    classifier.classify(&operation, &domain, target.as_deref(), reasoning.as_deref())
}

/// Get all supported action types
#[napi_derive::napi]
pub fn get_action_types() -> Vec<String> {
    vec![
        "modify".to_string(),
        "execute".to_string(),
        "communicate".to_string(),
        "transfer".to_string(),
        "observe".to_string(),
        "create".to_string(),
        "delete".to_string(),
    ]
}

/// Get risk levels for all action types
#[napi_derive::napi]
pub fn get_action_risk_levels() -> Vec<ActionRiskInfo> {
    vec![
        ActionRiskInfo { action_type: "observe".to_string(), risk_level: 1.0 },
        ActionRiskInfo { action_type: "create".to_string(), risk_level: 2.0 },
        ActionRiskInfo { action_type: "modify".to_string(), risk_level: 3.0 },
        ActionRiskInfo { action_type: "communicate".to_string(), risk_level: 3.0 },
        ActionRiskInfo { action_type: "execute".to_string(), risk_level: 4.0 },
        ActionRiskInfo { action_type: "delete".to_string(), risk_level: 4.0 },
        ActionRiskInfo { action_type: "transfer".to_string(), risk_level: 5.0 },
    ]
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[napi(object)]
pub struct ActionRiskInfo {
    pub action_type: String,
    pub risk_level: f64,
}
