//! Domain-Specific Action Handlers
//!
//! Provides pluggable handlers for different action domains.
//! Each domain can define its own validation rules and risk assessment.

use super::{ClassifiedAction, ActionValidationResult, ActionContextForValidation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Domain handler trait for custom validation
pub trait DomainHandler: Send + Sync {
    /// Get domain identifier
    fn domain_id(&self) -> &str;

    /// Validate an action in this domain
    fn validate(&self, context: &ActionContextForValidation) -> Option<ActionValidationResult>;

    /// Assess risk level for an action (1-5)
    fn assess_risk(&self, action: &ClassifiedAction) -> f64;

    /// Get domain-specific recommendations
    fn recommendations(&self, action: &ClassifiedAction) -> Vec<String>;
}

/// File system domain handler
pub struct FileSystemDomainHandler {
    /// Protected paths (cannot be modified)
    protected_paths: Vec<String>,

    /// Read-only paths
    read_only_paths: Vec<String>,

    /// Require approval for files larger than this (bytes)
    large_file_threshold: f64,
}

impl Default for FileSystemDomainHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl FileSystemDomainHandler {
    pub fn new() -> Self {
        FileSystemDomainHandler {
            protected_paths: vec![
                ".env".to_string(),
                "*.key".to_string(),
                "*.pem".to_string(),
                "credentials*".to_string(),
                ".ssh/*".to_string(),
                ".gnupg/*".to_string(),
            ],
            read_only_paths: vec![
                "/etc/*".to_string(),
                "/usr/*".to_string(),
                "/bin/*".to_string(),
            ],
            large_file_threshold: 10.0 * 1024.0 * 1024.0, // 10 MB
        }
    }

    fn is_protected(&self, path: &str) -> bool {
        self.protected_paths.iter().any(|p| wildcard_match(p, path))
    }

    fn is_read_only(&self, path: &str) -> bool {
        self.read_only_paths.iter().any(|p| wildcard_match(p, path))
    }
}

impl DomainHandler for FileSystemDomainHandler {
    fn domain_id(&self) -> &str {
        "file"
    }

    fn validate(&self, context: &ActionContextForValidation) -> Option<ActionValidationResult> {
        let target = context.target.as_deref()?;

        // Check protected paths
        if self.is_protected(target) {
            return Some(ActionValidationResult {
                allowed: false,
                classification: None,
                reason: format!("Path '{}' is protected and cannot be modified", target),
                violated_policy: Some("protected_path".to_string()),
                approval_required: false,
                approval_token: None,
                alternatives: vec![
                    "Use a different path".to_string(),
                    "Request admin override if necessary".to_string(),
                ],
                confidence: 1.0,
            });
        }

        // Check read-only paths
        if self.is_read_only(target) && context.action_type != "observe" {
            return Some(ActionValidationResult {
                allowed: false,
                classification: None,
                reason: format!("Path '{}' is read-only", target),
                violated_policy: Some("read_only_path".to_string()),
                approval_required: false,
                approval_token: None,
                alternatives: vec![],
                confidence: 1.0,
            });
        }

        None
    }

    fn assess_risk(&self, action: &ClassifiedAction) -> f64 {
        let base_risk = action.risk_level;

        // Increase risk for sensitive paths
        if let Some(ref target) = action.target {
            if self.is_protected(target) {
                return 5.0;
            }
            if self.is_read_only(target) {
                return 4.0;
            }
        }

        base_risk
    }

    fn recommendations(&self, action: &ClassifiedAction) -> Vec<String> {
        let mut recs = Vec::new();

        if action.action_type == "delete" {
            recs.push("Consider moving to trash/archive instead of deleting".to_string());
        }

        if action.action_type == "modify" {
            recs.push("Create a backup before modifying important files".to_string());
        }

        recs
    }
}

/// Network domain handler
pub struct NetworkDomainHandler {
    /// Allowed hosts (empty = all allowed)
    allowed_hosts: Vec<String>,

    /// Blocked hosts
    blocked_hosts: Vec<String>,

    /// Require approval for external requests
    require_approval_external: bool,
}

impl Default for NetworkDomainHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl NetworkDomainHandler {
    pub fn new() -> Self {
        NetworkDomainHandler {
            allowed_hosts: vec![],
            blocked_hosts: vec![
                "malware.*".to_string(),
                "*.local".to_string(), // Block local network by default
            ],
            require_approval_external: true,
        }
    }

    fn is_blocked(&self, host: &str) -> bool {
        self.blocked_hosts.iter().any(|p| wildcard_match(p, host))
    }

    fn is_allowed(&self, host: &str) -> bool {
        if self.allowed_hosts.is_empty() {
            return true;
        }
        self.allowed_hosts.iter().any(|p| wildcard_match(p, host))
    }
}

impl DomainHandler for NetworkDomainHandler {
    fn domain_id(&self) -> &str {
        "network"
    }

    fn validate(&self, context: &ActionContextForValidation) -> Option<ActionValidationResult> {
        if let Some(ref target) = context.target {
            // Extract host from URL
            let host = extract_host(target);

            if self.is_blocked(&host) {
                return Some(ActionValidationResult {
                    allowed: false,
                    classification: None,
                    reason: format!("Host '{}' is blocked", host),
                    violated_policy: Some("blocked_host".to_string()),
                    approval_required: false,
                    approval_token: None,
                    alternatives: vec![],
                    confidence: 1.0,
                });
            }

            if !self.is_allowed(&host) {
                return Some(ActionValidationResult {
                    allowed: false,
                    classification: None,
                    reason: format!("Host '{}' is not in allowed list", host),
                    violated_policy: Some("host_not_allowed".to_string()),
                    approval_required: true,
                    approval_token: None,
                    alternatives: vec![],
                    confidence: 1.0,
                });
            }
        }

        None
    }

    fn assess_risk(&self, action: &ClassifiedAction) -> f64 {
        let mut risk = action.risk_level;

        if let Some(ref target) = action.target {
            let host = extract_host(target);

            // External requests are higher risk
            if !host.ends_with(".local") && !host.starts_with("localhost") {
                risk = (risk + 1.0).min(5.0);
            }
        }

        risk
    }

    fn recommendations(&self, action: &ClassifiedAction) -> Vec<String> {
        let mut recs = Vec::new();

        if action.action_type == "communicate" {
            recs.push("Verify SSL/TLS certificates for HTTPS requests".to_string());
            recs.push("Consider rate limiting API calls".to_string());
        }

        recs
    }
}

/// Shell/Execution domain handler
pub struct ShellDomainHandler {
    /// Allowed commands (empty = all allowed)
    allowed_commands: Vec<String>,

    /// Blocked commands
    blocked_commands: Vec<String>,

    /// Require approval for shell execution
    require_approval: bool,
}

impl Default for ShellDomainHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl ShellDomainHandler {
    pub fn new() -> Self {
        ShellDomainHandler {
            allowed_commands: vec![],
            blocked_commands: vec![
                "rm -rf /".to_string(),
                "mkfs".to_string(),
                "dd if=/dev/zero".to_string(),
                ":(){ :|:& };:".to_string(), // Fork bomb
                "chmod 777".to_string(),
                "chown root".to_string(),
            ],
            require_approval: true,
        }
    }

    fn is_blocked(&self, command: &str) -> bool {
        self.blocked_commands.iter().any(|p| {
            command.to_lowercase().contains(&p.to_lowercase())
        })
    }
}

impl DomainHandler for ShellDomainHandler {
    fn domain_id(&self) -> &str {
        "shell"
    }

    fn validate(&self, context: &ActionContextForValidation) -> Option<ActionValidationResult> {
        if let Some(ref target) = context.target {
            if self.is_blocked(target) {
                return Some(ActionValidationResult {
                    allowed: false,
                    classification: None,
                    reason: format!("Command '{}' is blocked for safety", target),
                    violated_policy: Some("blocked_command".to_string()),
                    approval_required: false,
                    approval_token: None,
                    alternatives: vec![
                        "Use a safer alternative command".to_string(),
                    ],
                    confidence: 1.0,
                });
            }
        }

        if self.require_approval {
            return Some(ActionValidationResult {
                allowed: false,
                classification: None,
                reason: "Shell execution requires approval".to_string(),
                violated_policy: None,
                approval_required: true,
                approval_token: None,
                alternatives: vec![],
                confidence: 1.0,
            });
        }

        None
    }

    fn assess_risk(&self, _action: &ClassifiedAction) -> f64 {
        4.0 // Shell execution is always high risk
    }

    fn recommendations(&self, _action: &ClassifiedAction) -> Vec<String> {
        vec![
            "Consider using a library instead of shell commands".to_string(),
            "Run in a sandboxed environment if possible".to_string(),
            "Log all shell commands for audit".to_string(),
        ]
    }
}

/// Domain registry that manages all domain handlers
pub struct DomainRegistry {
    handlers: HashMap<String, Box<dyn DomainHandler>>,
}

impl Default for DomainRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl DomainRegistry {
    pub fn new() -> Self {
        let mut registry = DomainRegistry {
            handlers: HashMap::new(),
        };

        // Register default handlers
        registry.register_file_handler();
        registry.register_network_handler();
        registry.register_shell_handler();

        registry
    }

    fn register_file_handler(&mut self) {
        self.handlers.insert(
            "file".to_string(),
            Box::new(FileSystemDomainHandler::new()),
        );
    }

    fn register_network_handler(&mut self) {
        self.handlers.insert(
            "network".to_string(),
            Box::new(NetworkDomainHandler::new()),
        );
    }

    fn register_shell_handler(&mut self) {
        self.handlers.insert(
            "shell".to_string(),
            Box::new(ShellDomainHandler::new()),
        );
    }

    /// Get handler for a domain
    pub fn get_handler(&self, domain: &str) -> Option<&dyn DomainHandler> {
        self.handlers.get(domain).map(|h| h.as_ref())
    }

    /// Validate using domain handler
    pub fn validate(&self, context: &ActionContextForValidation) -> Option<ActionValidationResult> {
        self.get_handler(&context.domain)
            .and_then(|h| h.validate(context))
    }

    /// Assess risk using domain handler
    pub fn assess_risk(&self, action: &ClassifiedAction) -> f64 {
        self.get_handler(&action.domain)
            .map(|h| h.assess_risk(action))
            .unwrap_or(action.risk_level)
    }
}

/// Simple wildcard matching
fn wildcard_match(pattern: &str, text: &str) -> bool {
    let pattern_lower = pattern.to_lowercase();
    let text_lower = text.to_lowercase();

    if pattern_lower.contains('*') {
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

/// Extract host from URL
fn extract_host(url: &str) -> String {
    // Simple extraction - remove protocol and path
    let without_protocol = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .or_else(|| url.strip_prefix("ws://"))
        .or_else(|| url.strip_prefix("wss://"))
        .unwrap_or(url);

    // Remove path
    if let Some(slash_pos) = without_protocol.find('/') {
        without_protocol[..slash_pos].to_string()
    } else {
        without_protocol.to_string()
    }
}

/// Create domain registry with default handlers
#[napi_derive::napi]
pub fn create_domain_registry() -> DomainRegistryHandle {
    DomainRegistryHandle {
        registry: DomainRegistry::new(),
    }
}

/// Handle for domain registry
#[napi]
pub struct DomainRegistryHandle {
    registry: DomainRegistry,
}

#[napi]
impl DomainRegistryHandle {
    /// Get available domains
    #[napi]
    pub fn available_domains(&self) -> Vec<String> {
        self.registry.handlers.keys().cloned().collect()
    }

    /// Assess risk for an action
    #[napi]
    pub fn assess_risk(&self, action: ClassifiedAction) -> f64 {
        self.registry.assess_risk(&action)
    }

    /// Validate an action
    #[napi]
    pub fn validate(&self, context: ActionContextForValidation) -> Option<ActionValidationResult> {
        self.registry.validate(&context)
    }
}

/// Domain configuration for file handler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FileDomainConfig {
    pub protected_paths: Vec<String>,
    pub read_only_paths: Vec<String>,
    pub large_file_threshold: f64,
}

/// Create file domain config
#[napi_derive::napi]
pub fn create_file_domain_config() -> FileDomainConfig {
    let handler = FileSystemDomainHandler::new();
    FileDomainConfig {
        protected_paths: handler.protected_paths.clone(),
        read_only_paths: handler.read_only_paths.clone(),
        large_file_threshold: handler.large_file_threshold,
    }
}

/// Domain configuration for network handler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct NetworkDomainConfig {
    pub allowed_hosts: Vec<String>,
    pub blocked_hosts: Vec<String>,
    pub require_approval_external: bool,
}

/// Create network domain config
#[napi_derive::napi]
pub fn create_network_domain_config() -> NetworkDomainConfig {
    let handler = NetworkDomainHandler::new();
    NetworkDomainConfig {
        allowed_hosts: handler.allowed_hosts.clone(),
        blocked_hosts: handler.blocked_hosts.clone(),
        require_approval_external: handler.require_approval_external,
    }
}

/// Domain configuration for shell handler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ShellDomainConfig {
    pub allowed_commands: Vec<String>,
    pub blocked_commands: Vec<String>,
    pub require_approval: bool,
}

/// Create shell domain config
#[napi_derive::napi]
pub fn create_shell_domain_config() -> ShellDomainConfig {
    let handler = ShellDomainHandler::new();
    ShellDomainConfig {
        allowed_commands: handler.allowed_commands.clone(),
        blocked_commands: handler.blocked_commands.clone(),
        require_approval: handler.require_approval,
    }
}
