//! Immutable Directives
//!
//! Cryptographically signed rules stored outside AI context.
//! These cannot be modified by conversation or prompt injection.
//! Based on Palantir AIP and NIST AI RMF 2.0 / AAGATE principles.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// An immutable directive - a rule that cannot be changed by AI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ImmutableDirective {
    /// Unique directive ID
    pub id: String,

    /// Directive type (e.g., "forbidden_action", "required_approval", "boundary")
    pub directive_type: String,

    /// The rule content (JSON)
    pub rule: String,

    /// Domain this applies to (e.g., "financial", "external", "credentials")
    pub domain: String,

    /// Priority (1 = highest, cannot be overridden)
    pub priority: u32,

    /// Whether this directive can be overridden by higher priority
    pub overridable: bool,

    /// Creation timestamp
    pub created_at: f64,

    /// Expiration timestamp (None = never expires)
    pub expires_at: Option<f64>,

    /// Who created this directive (user, system, admin)
    pub created_by: String,

    /// Cryptographic signature
    pub signature: Option<String>,

    /// Public key that signed this
    pub signed_by: Option<String>,

    /// Hash of the rule for integrity checking
    pub rule_hash: String,
}

/// Directive evaluation result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DirectiveResult {
    /// Whether the action is allowed
    pub allowed: bool,

    /// Whether approval is required
    pub requires_approval: bool,

    /// Directives that were violated
    pub violations: Vec<DirectiveViolation>,

    /// Directives that require approval
    pub approval_directives: Vec<String>,

    /// Reason for denial (if any)
    pub denial_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DirectiveViolation {
    pub directive_id: String,
    pub directive_type: String,
    pub reason: String,
    pub severity: String, // "critical", "high", "medium", "low"
}

/// Directive store - manages immutable directives
pub struct DirectiveStore {
    directives: HashMap<String, ImmutableDirective>,
    signing_key: Option<SigningKey>,
    verifying_keys: HashMap<String, VerifyingKey>,
}

impl Default for DirectiveStore {
    fn default() -> Self {
        Self::new()
    }
}

/// Internal result for rule evaluation
struct RuleEvalResult {
    matches: bool,
    reason: Option<String>,
}

impl DirectiveStore {
    pub fn new() -> Self {
        DirectiveStore {
            directives: HashMap::new(),
            signing_key: None,
            verifying_keys: HashMap::new(),
        }
    }

    /// Set the signing key for creating new directives
    pub fn set_signing_key(&mut self, private_key_hex: &str) -> Result<(), String> {
        let bytes = hex::decode(private_key_hex)
            .map_err(|e| format!("Invalid hex: {}", e))?;
        let array: [u8; 32] = bytes.as_slice()
            .try_into()
            .map_err(|_| "Invalid key length")?;
        self.signing_key = Some(SigningKey::from_bytes(&array));
        Ok(())
    }

    /// Add a verifying key for checking directive signatures
    pub fn add_verifying_key(&mut self, public_key_hex: &str) -> Result<(), String> {
        let bytes = hex::decode(public_key_hex)
            .map_err(|e| format!("Invalid hex: {}", e))?;
        let array: [u8; 32] = bytes.as_slice()
            .try_into()
            .map_err(|_| "Invalid key length")?;
        let verifying_key = VerifyingKey::from_bytes(&array)
            .map_err(|e| format!("Invalid public key: {}", e))?;
        self.verifying_keys.insert(public_key_hex.to_string(), verifying_key);
        Ok(())
    }

    /// Create and sign a new directive
    pub fn create_directive(
        &mut self,
        directive_type: String,
        rule: String,
        domain: String,
        priority: u32,
        overridable: bool,
        created_by: String,
        expires_at: Option<f64>,
    ) -> Result<ImmutableDirective, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();

        // Hash the rule for integrity
        let rule_hash = Self::hash_rule(&rule);

        let id = format!("directive-{}-{:x}", directive_type,
            Self::hash_string(&format!("{}{}{}", rule, domain, now)));

        let mut directive = ImmutableDirective {
            id: id.clone(),
            directive_type,
            rule,
            domain,
            priority,
            overridable,
            created_at: now,
            expires_at,
            created_by,
            signature: None,
            signed_by: None,
            rule_hash,
        };

        // Sign if we have a signing key
        if let Some(ref key) = self.signing_key {
            let canonical = Self::canonicalize(&directive)?;
            let signature = key.sign(canonical.as_bytes());
            directive.signature = Some(BASE64.encode(signature.to_bytes()));
            directive.signed_by = Some(hex::encode(key.verifying_key().as_bytes()));
        }

        self.directives.insert(id, directive.clone());
        Ok(directive)
    }

    /// Add a pre-signed directive
    pub fn add_directive(&mut self, directive: ImmutableDirective) -> Result<(), String> {
        // Verify signature if present
        if let (Some(_sig), Some(_pk)) = (&directive.signature, &directive.signed_by) {
            if !self.verify_directive_signature(&directive) {
                return Err("Invalid directive signature".to_string());
            }
        }

        // Check expiration
        if let Some(expires) = directive.expires_at {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs_f64();
            if now > expires {
                return Err("Directive has expired".to_string());
            }
        }

        self.directives.insert(directive.id.clone(), directive);
        Ok(())
    }

    /// Verify a directive's signature
    pub fn verify_directive_signature(&self, directive: &ImmutableDirective) -> bool {
        let signature_b64 = match &directive.signature {
            Some(s) => s,
            None => return false,
        };

        let public_key_hex = match &directive.signed_by {
            Some(pk) => pk,
            None => return false,
        };

        // Try to get the verifying key
        let verifying_key = match self.verifying_keys.get(public_key_hex) {
            Some(k) => k,
            None => {
                // Try to parse it and insert into the map for future use
                let bytes = match hex::decode(public_key_hex) {
                    Ok(b) => b,
                    Err(_) => return false,
                };
                let array: [u8; 32] = match bytes.as_slice().try_into() {
                    Ok(a) => a,
                    Err(_) => return false,
                };
                match VerifyingKey::from_bytes(&array) {
                    Ok(k) => {
                        // Note: We can't insert here due to borrow rules
                        // Just use the key directly
                        return Self::verify_with_key(&k, signature_b64, directive);
                    }
                    Err(_) => return false,
                }
            }
        };

        let signature_bytes = match BASE64.decode(signature_b64) {
            Ok(b) => b,
            Err(_) => return false,
        };

        let signature = match Signature::from_slice(&signature_bytes) {
            Ok(s) => s,
            Err(_) => return false,
        };

        let canonical = match Self::canonicalize(directive) {
            Ok(c) => c,
            Err(_) => return false,
        };

        verifying_key.verify(canonical.as_bytes(), &signature).is_ok()
    }

    /// Helper to verify with a key reference
    fn verify_with_key(key: &VerifyingKey, signature_b64: &str, directive: &ImmutableDirective) -> bool {
        let signature_bytes = match BASE64.decode(signature_b64) {
            Ok(b) => b,
            Err(_) => return false,
        };

        let signature = match Signature::from_slice(&signature_bytes) {
            Ok(s) => s,
            Err(_) => return false,
        };

        let canonical = match Self::canonicalize(directive) {
            Ok(c) => c,
            Err(_) => return false,
        };

        key.verify(canonical.as_bytes(), &signature).is_ok()
    }

    /// Remove a directive (only if allowed)
    pub fn remove_directive(&mut self, id: &str) -> Result<(), String> {
        let directive = self.directives.get(id)
            .ok_or("Directive not found")?;

        if !directive.overridable {
            return Err("Directive is immutable and cannot be removed".to_string());
        }

        self.directives.remove(id);
        Ok(())
    }

    /// Get all directives
    pub fn get_all(&self) -> Vec<&ImmutableDirective> {
        self.directives.values().collect()
    }

    /// Get directives by domain
    pub fn get_by_domain(&self, domain: &str) -> Vec<&ImmutableDirective> {
        self.directives.values()
            .filter(|d| d.domain == domain || d.domain == "*")
            .collect()
    }

    /// Get directives by type
    pub fn get_by_type(&self, directive_type: &str) -> Vec<&ImmutableDirective> {
        self.directives.values()
            .filter(|d| d.directive_type == directive_type)
            .collect()
    }

    /// Evaluate an action against all directives
    pub fn evaluate(
        &self,
        action_type: &str,
        domain: &str,
        target: Option<&str>,
        params: &str,
    ) -> DirectiveResult {
        let mut violations = Vec::new();
        let mut approval_directives = Vec::new();
        let mut denial_reason = None;

        // Get applicable directives
        let applicable: Vec<_> = self.directives.values()
            .filter(|d| {
                // Check domain match
                d.domain == "*" || d.domain == domain
            })
            .filter(|d| {
                // Check expiration
                if let Some(expires) = d.expires_at {
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs_f64();
                    now < expires
                } else {
                    true
                }
            })
            .collect();

        for directive in applicable {
            // Parse the rule
            let rule_result = self.evaluate_rule(&directive.rule, action_type, domain, target, params);

            match directive.directive_type.as_str() {
                "forbidden_action" => {
                    if rule_result.matches {
                        violations.push(DirectiveViolation {
                            directive_id: directive.id.clone(),
                            directive_type: directive.directive_type.clone(),
                            reason: rule_result.reason.unwrap_or_else(|| "Action forbidden by directive".to_string()),
                            severity: if directive.priority == 1 { "critical" } else { "high" }.to_string(),
                        });
                    }
                }
                "required_approval" => {
                    if rule_result.matches {
                        approval_directives.push(directive.id.clone());
                    }
                }
                "boundary" => {
                    if rule_result.matches {
                        if directive.priority == 1 {
                            violations.push(DirectiveViolation {
                                directive_id: directive.id.clone(),
                                directive_type: directive.directive_type.clone(),
                                reason: rule_result.reason.unwrap_or_else(|| "Boundary violation".to_string()),
                                severity: "critical".to_string(),
                            });
                        } else {
                            approval_directives.push(directive.id.clone());
                        }
                    }
                }
                "constraint" => {
                    if rule_result.matches {
                        approval_directives.push(directive.id.clone());
                    }
                }
                _ => {}
            }
        }

        // Determine final decision
        let has_critical = violations.iter().any(|v| v.severity == "critical");
        let allowed = !has_critical && violations.is_empty();

        if !allowed && denial_reason.is_none() {
            denial_reason = Some(format!(
                "Violated {} directive(s): {}",
                violations.len(),
                violations.iter().map(|v| &v.directive_id).cloned().collect::<Vec<_>>().join(", ")
            ));
        }

        DirectiveResult {
            allowed,
            requires_approval: !approval_directives.is_empty(),
            violations,
            approval_directives,
            denial_reason,
        }
    }

    fn evaluate_rule(
        &self,
        rule: &str,
        action_type: &str,
        domain: &str,
        target: Option<&str>,
        params: &str,
    ) -> RuleEvalResult {
        // Parse rule as JSON
        let rule_json: serde_json::Value = match serde_json::from_str(rule) {
            Ok(v) => v,
            Err(_) => {
                // Treat as simple string match
                return RuleEvalResult {
                    matches: rule.contains(action_type) || rule.contains(domain),
                    reason: Some(format!("Rule pattern match: {}", rule)),
                };
            }
        };

        // Check action patterns
        if let Some(actions) = rule_json.get("actions").and_then(|a| a.as_array()) {
            for action in actions {
                if let Some(action_str) = action.as_str() {
                    if action_type == action_str || action_str == "*" {
                        return RuleEvalResult {
                            matches: true,
                            reason: Some(format!("Action {} matches pattern {}", action_type, action_str)),
                        };
                    }
                }
            }
        }

        // Check domain patterns
        if let Some(domains) = rule_json.get("domains").and_then(|d| d.as_array()) {
            for d in domains {
                if let Some(d_str) = d.as_str() {
                    if domain == d_str || d_str == "*" {
                        return RuleEvalResult {
                            matches: true,
                            reason: Some(format!("Domain {} matches pattern {}", domain, d_str)),
                        };
                    }
                }
            }
        }

        // Check target patterns
        if let Some(patterns) = rule_json.get("target_patterns").and_then(|p| p.as_array()) {
            if let Some(t) = target {
                for pattern in patterns {
                    if let Some(p_str) = pattern.as_str() {
                        if t.contains(p_str) {
                            return RuleEvalResult {
                                matches: true,
                                reason: Some(format!("Target {} matches pattern {}", t, p_str)),
                            };
                        }
                    }
                }
            }
        }

        // Check param patterns (for detecting things like crypto addresses, credentials)
        if let Some(param_patterns) = rule_json.get("param_patterns").and_then(|p| p.as_array()) {
            for pattern in param_patterns {
                if let Some(p_str) = pattern.as_str() {
                    if params.contains(p_str) {
                        return RuleEvalResult {
                            matches: true,
                            reason: Some(format!("Params contain forbidden pattern: {}", p_str)),
                        };
                    }
                }
            }
        }

        RuleEvalResult {
            matches: false,
            reason: None,
        }
    }

    fn hash_rule(rule: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(rule.as_bytes());
        hex::encode(hasher.finalize())
    }

    fn hash_string(input: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        input.hash(&mut hasher);
        hasher.finish()
    }

    fn canonicalize(directive: &ImmutableDirective) -> Result<String, String> {
        // Create canonical form without signature fields
        let canonical = serde_json::json!({
            "id": directive.id,
            "directive_type": directive.directive_type,
            "rule": directive.rule,
            "domain": directive.domain,
            "priority": directive.priority,
            "overridable": directive.overridable,
            "created_at": directive.created_at,
            "created_by": directive.created_by,
            "rule_hash": directive.rule_hash,
        });

        serde_json::to_string(&canonical)
            .map_err(|e| format!("Failed to serialize: {}", e))
    }
}

// NAPI bindings

/// Create a new directive store
#[napi_derive::napi]
pub fn create_directive_store() -> DirectiveStoreHandle {
    DirectiveStoreHandle {
        store: DirectiveStore::new(),
    }
}

/// Handle for directive store
#[napi]
pub struct DirectiveStoreHandle {
    store: DirectiveStore,
}

#[napi]
impl DirectiveStoreHandle {
    /// Set signing key
    #[napi]
    pub fn set_signing_key(&mut self, private_key_hex: String) -> napi::Result<()> {
        self.store.set_signing_key(&private_key_hex)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Create a new directive
    #[napi]
    pub fn create_directive(
        &mut self,
        directive_type: String,
        rule: String,
        domain: String,
        priority: Option<u32>,
        overridable: Option<bool>,
        created_by: String,
        expires_at: Option<f64>,
    ) -> napi::Result<ImmutableDirective> {
        self.store.create_directive(
            directive_type,
            rule,
            domain,
            priority.unwrap_or(5),
            overridable.unwrap_or(false),
            created_by,
            expires_at,
        ).map_err(|e| napi::Error::from_reason(e))
    }

    /// Add a directive
    #[napi]
    pub fn add_directive(&mut self, directive: ImmutableDirective) -> napi::Result<()> {
        self.store.add_directive(directive)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Get all directives
    #[napi]
    pub fn get_all(&self) -> Vec<ImmutableDirective> {
        self.store.get_all().into_iter().cloned().collect()
    }

    /// Get directives by domain
    #[napi]
    pub fn get_by_domain(&self, domain: String) -> Vec<ImmutableDirective> {
        self.store.get_by_domain(&domain).into_iter().cloned().collect()
    }

    /// Evaluate an action
    #[napi]
    pub fn evaluate(
        &self,
        action_type: String,
        domain: String,
        target: Option<String>,
        params: String,
    ) -> DirectiveResult {
        self.store.evaluate(
            &action_type,
            &domain,
            target.as_deref(),
            &params,
        )
    }

    /// Remove a directive
    #[napi]
    pub fn remove_directive(&mut self, id: String) -> napi::Result<()> {
        self.store.remove_directive(&id)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Get directive count
    #[napi]
    pub fn count(&self) -> f64 {
        self.store.directives.len() as f64
    }
}

/// Create default security directives for financial protection
#[napi_derive::napi]
pub fn create_default_financial_directives(store: &mut DirectiveStoreHandle) -> napi::Result<Vec<ImmutableDirective>> {
    let mut directives = Vec::new();

    // Forbidden: cryptocurrency transfers
    directives.push(store.create_directive(
        "forbidden_action".to_string(),
        serde_json::json!({
            "actions": ["*"],
            "param_patterns": [
                "send.*eth", "send.*btc", "transfer.*crypto",
                "wallet.*address", "0x[a-fA-F0-9]{40}",
                "bc1[a-zA-Z0-9]{39,59}"
            ]
        }).to_string(),
        "financial".to_string(),
        Some(1), // Highest priority
        Some(false), // Not overridable
        "system".to_string(),
        None,
    )?);

    // Forbidden: credential exposure
    directives.push(store.create_directive(
        "forbidden_action".to_string(),
        serde_json::json!({
            "actions": ["mcp__telegram__telegram_send_message", "mcp__telegram__telegram_forward_messages"],
            "param_patterns": [
                "password", "secret", "api_key", "token",
                "private_key", "seed_phrase", "mnemonic"
            ]
        }).to_string(),
        "credentials".to_string(),
        Some(1),
        Some(false),
        "system".to_string(),
        None,
    )?);

    // Required approval: external communications
    directives.push(store.create_directive(
        "required_approval".to_string(),
        serde_json::json!({
            "actions": ["mcp__telegram__*"],
            "domains": ["external"]
        }).to_string(),
        "external".to_string(),
        Some(2),
        Some(true),
        "system".to_string(),
        None,
    )?);

    // Boundary: value transfers
    directives.push(store.create_directive(
        "boundary".to_string(),
        serde_json::json!({
            "actions": ["*"],
            "param_patterns": ["transfer", "send.*money", "wire", "payment"]
        }).to_string(),
        "financial".to_string(),
        Some(1),
        Some(false),
        "system".to_string(),
        None,
    )?);

    Ok(directives)
}
