//! Intent Directives Management
//!
//! Loading, storing, and managing agent intent directives.

use super::{AgentIntent, AgentIdentity, AgentPurpose, AgentPrinciples, Goal, Boundary};
use std::path::Path;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

/// Create a new intent builder
#[napi_derive::napi]
pub fn create_intent_builder() -> IntentBuilder {
    IntentBuilder {
        intent: AgentIntent {
            id: String::new(),
            version: 1,
            identity: AgentIdentity {
                name: String::new(),
                description: String::new(),
                capabilities: Vec::new(),
                constraints: Vec::new(),
            },
            purpose: AgentPurpose {
                goals: Vec::new(),
                non_goals: Vec::new(),
                boundaries: Vec::new(),
            },
            principles: AgentPrinciples {
                values: Vec::new(),
                priorities: Vec::new(),
                forbidden: Vec::new(),
            },
            signature: None,
            created_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            signed_by: None,
        },
    }
}

/// Builder for creating agent intents
#[derive(Debug, Clone)]
#[napi]
pub struct IntentBuilder {
    intent: AgentIntent,
}

#[napi]
impl IntentBuilder {
    /// Set agent name
    #[napi]
    pub fn name(&mut self, name: String) -> &Self {
        self.intent.identity.name = name;
        self
    }

    /// Set agent description
    #[napi]
    pub fn description(&mut self, description: String) -> &Self {
        self.intent.identity.description = description;
        self
    }

    /// Add a capability
    #[napi]
    pub fn add_capability(&mut self, capability: String) -> &Self {
        self.intent.identity.capabilities.push(capability);
        self
    }

    /// Add multiple capabilities
    #[napi]
    pub fn add_capabilities(&mut self, capabilities: Vec<String>) -> &Self {
        self.intent.identity.capabilities.extend(capabilities);
        self
    }

    /// Add a constraint
    #[napi]
    pub fn add_constraint(&mut self, constraint: String) -> &Self {
        self.intent.identity.constraints.push(constraint);
        self
    }

    /// Add multiple constraints
    #[napi]
    pub fn add_constraints(&mut self, constraints: Vec<String>) -> &Self {
        self.intent.identity.constraints.extend(constraints);
        self
    }

    /// Add a goal
    #[napi]
    pub fn add_goal(
        &mut self,
        id: String,
        description: String,
        priority: Option<String>,
        success_criteria: Option<String>,
    ) -> &Self {
        self.intent.purpose.goals.push(Goal {
            id,
            description,
            priority: priority.unwrap_or_else(|| "medium".to_string()),
            measurable: success_criteria.is_some(),
            success_criteria,
        });
        self
    }

    /// Add a non-goal
    #[napi]
    pub fn add_non_goal(&mut self, non_goal: String) -> &Self {
        self.intent.purpose.non_goals.push(non_goal);
        self
    }

    /// Add a boundary
    #[napi]
    pub fn add_boundary(
        &mut self,
        id: String,
        description: String,
        domain: String,
        enforcement: Option<String>,
        pattern: Option<String>,
    ) -> &Self {
        self.intent.purpose.boundaries.push(Boundary {
            id,
            description,
            enforcement: enforcement.unwrap_or_else(|| "require_approval".to_string()),
            domain,
            pattern,
        });
        self
    }

    /// Add a value
    #[napi]
    pub fn add_value(&mut self, value: String) -> &Self {
        self.intent.principles.values.push(value);
        self
    }

    /// Add a priority
    #[napi]
    pub fn add_priority(&mut self, priority: String) -> &Self {
        self.intent.principles.priorities.push(priority);
        self
    }

    /// Add a forbidden action/pattern
    #[napi]
    pub fn add_forbidden(&mut self, forbidden: String) -> &Self {
        self.intent.principles.forbidden.push(forbidden);
        self
    }

    /// Build the intent (without signing)
    #[napi]
    pub fn build(&self) -> AgentIntent {
        let mut intent = self.intent.clone();
        intent.id = format!("intent-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));
        intent
    }
}

/// Load intent from a JSON file
#[napi_derive::napi]
pub fn load_intent_from_file(path: String) -> napi::Result<AgentIntent> {
    let content = fs::read_to_string(&path)
        .map_err(|e| napi::Error::from_reason(format!("Failed to read file: {}", e)))?;

    let intent: AgentIntent = serde_json::from_str(&content)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse intent: {}", e)))?;

    Ok(intent)
}

/// Save intent to a JSON file
#[napi_derive::napi]
pub fn save_intent_to_file(intent: AgentIntent, path: String) -> napi::Result<()> {
    let content = serde_json::to_string_pretty(&intent)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize intent: {}", e)))?;

    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| napi::Error::from_reason(format!("Failed to create directory: {}", e)))?;
    }

    fs::write(&path, content)
        .map_err(|e| napi::Error::from_reason(format!("Failed to write file: {}", e)))?;

    Ok(())
}

/// Load intent from a JSON string
#[napi_derive::napi]
pub fn parse_intent(json: String) -> napi::Result<AgentIntent> {
    serde_json::from_str(&json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse intent: {}", e)))
}

/// Serialize intent to JSON string
#[napi_derive::napi]
pub fn serialize_intent(intent: AgentIntent) -> napi::Result<String> {
    serde_json::to_string_pretty(&intent)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize intent: {}", e)))
}

/// Validate intent structure (without checking signature)
#[napi_derive::napi]
pub fn validate_intent_structure(intent: AgentIntent) -> ValidationResult {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Required fields
    if intent.identity.name.is_empty() {
        errors.push("Identity name is required".to_string());
    }

    if intent.identity.description.is_empty() {
        warnings.push("Identity description is empty".to_string());
    }

    if intent.purpose.goals.is_empty() {
        warnings.push("No goals defined - agent has no purpose".to_string());
    }

    // Validate each goal
    for goal in &intent.purpose.goals {
        if goal.id.is_empty() {
            errors.push(format!("Goal has empty id: {}", goal.description));
        }
        if goal.description.is_empty() {
            errors.push(format!("Goal {} has empty description", goal.id));
        }
    }

    // Validate each boundary
    for boundary in &intent.purpose.boundaries {
        if boundary.id.is_empty() {
            errors.push(format!("Boundary has empty id: {}", boundary.description));
        }
        if boundary.domain.is_empty() {
            warnings.push(format!("Boundary {} has no domain specified", boundary.id));
        }
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[napi(object)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Create a default intent for a data collection agent
#[napi_derive::napi]
pub fn create_data_collector_intent(
    name: String,
    description: String,
) -> AgentIntent {
    let mut builder = create_intent_builder();

    builder
        .name(name)
        .description(description.clone())
        .add_capabilities(vec![
            "read_webpages".to_string(),
            "call_apis".to_string(),
            "store_data".to_string(),
            "process_text".to_string(),
        ])
        .add_constraints(vec![
            "no_code_modification".to_string(),
            "no_shell_execution".to_string(),
            "no_value_transfer".to_string(),
        ])

        // Goals
        .add_goal(
            "collect_data".to_string(),
            "Collect relevant data from configured sources".to_string(),
            Some("high".to_string()),
            None,
        )
        .add_goal(
            "process_data".to_string(),
            "Process and structure collected data".to_string(),
            Some("medium".to_string()),
            None,
        )
        .add_goal(
            "store_findings".to_string(),
            "Store processed data in designated storage".to_string(),
            Some("medium".to_string()),
            None,
        )

        // Non-goals
        .add_non_goal("interacting with users directly".to_string())
        .add_non_goal("making financial decisions".to_string())
        .add_non_goal("modifying source code".to_string())

        // Boundaries
        .add_boundary(
            "no_self_modification".to_string(),
            "Cannot modify own source code or configuration".to_string(),
            "code".to_string(),
            Some("never".to_string()),
            Some("self".to_string()),
        )
        .add_boundary(
            "no_unapproved_storage".to_string(),
            "Can only write to approved storage locations".to_string(),
            "file".to_string(),
            Some("require_approval".to_string()),
            None,
        )

        // Values
        .add_value("Data accuracy over speed".to_string())
        .add_value("Privacy and consent respect".to_string())
        .add_value("Transparency in operations".to_string())

        // Priorities
        .add_priority("Stay within boundaries".to_string())
        .add_priority("Collect quality data".to_string())
        .add_priority("Process efficiently".to_string())

        // Forbidden
        .add_forbidden("execute_shell".to_string())
        .add_forbidden("transfer_value".to_string())
        .add_forbidden("modify_code".to_string())
        .add_forbidden("expose_credentials".to_string());

    builder.build()
}

/// Merge two intents (child overrides parent)
#[napi_derive::napi]
pub fn merge_intents(base: AgentIntent, override_intent: AgentIntent) -> AgentIntent {
    let mut merged = base.clone();

    // Override simple fields if set
    if !override_intent.identity.name.is_empty() {
        merged.identity.name = override_intent.identity.name.clone();
    }
    if !override_intent.identity.description.is_empty() {
        merged.identity.description = override_intent.identity.description.clone();
    }

    // Merge lists (additive)
    merged.identity.capabilities.extend(
        override_intent.identity.capabilities.iter().cloned()
    );
    merged.identity.constraints.extend(
        override_intent.identity.constraints.iter().cloned()
    );
    merged.purpose.goals.extend(
        override_intent.purpose.goals.iter().cloned()
    );
    merged.purpose.non_goals.extend(
        override_intent.purpose.non_goals.iter().cloned()
    );
    merged.purpose.boundaries.extend(
        override_intent.purpose.boundaries.iter().cloned()
    );
    merged.principles.values.extend(
        override_intent.principles.values.iter().cloned()
    );
    merged.principles.priorities.extend(
        override_intent.principles.priorities.iter().cloned()
    );
    merged.principles.forbidden.extend(
        override_intent.principles.forbidden.iter().cloned()
    );

    // Increment version
    merged.version = base.version.max(override_intent.version) + 1;
    merged.id = format!("intent-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));
    merged.created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Clear signature (needs re-signing)
    merged.signature = None;
    merged.signed_by = None;

    merged
}
