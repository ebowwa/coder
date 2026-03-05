//! Signed Actions
//!
//! Every action is cryptographically signed before execution.
//! This creates an immutable audit trail that can be verified.
//! Based on NIST AI RMF 2.0 / AAGATE cryptographic action signing.

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// A signed action record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct SignedAction {
    /// Unique action ID
    pub id: String,

    /// Sequence number (monotonically increasing per session)
    pub sequence: f64,

    /// Session ID this action belongs to
    pub session_id: String,

    /// Tool/action name
    pub tool: String,

    /// Action domain
    pub domain: String,

    /// Action type (observe, modify, execute, transfer)
    pub action_type: String,

    /// Target of the action (file path, URL, etc.)
    pub target: Option<String>,

    /// Hash of parameters (for integrity, not exposure)
    pub params_hash: String,

    /// When the action was signed (Unix timestamp in seconds)
    pub timestamp: f64,

    /// Unique nonce for replay protection (random 16 bytes, hex encoded)
    pub nonce: String,

    /// Intent ID this action is aligned with
    pub intent_id: Option<String>,

    /// Cryptographic signature
    pub signature: String,

    /// Public key that signed this action
    pub signed_by: String,

    /// Hash of the previous action (for chain integrity)
    pub prev_hash: Option<String>,

    /// Computed hash of this action
    pub hash: String,
}

/// Replay protection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ReplayProtectionConfig {
    /// Maximum age of actions in seconds (default: 300 = 5 minutes)
    pub max_age_seconds: Option<f64>,

    /// Whether to reject actions with timestamps in the future
    pub reject_future: Option<bool>,

    /// Tolerance for clock skew in seconds (default: 60)
    pub clock_skew_tolerance: Option<f64>,
}

/// Replay detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ReplayDetectionResult {
    /// Whether this is a replay attack
    pub is_replay: bool,

    /// Reason for replay detection
    pub reason: Option<String>,

    /// The original action ID if replay detected
    pub original_action_id: Option<String>,
}

/// Action verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ActionVerification {
    /// Whether the signature is valid
    pub signature_valid: bool,

    /// Whether the chain is intact (prev_hash matches)
    pub chain_intact: bool,

    /// Whether this action's hash is correct
    pub hash_valid: bool,

    /// Whether the intent alignment is verified
    pub intent_verified: bool,

    /// Overall validity
    pub valid: bool,

    /// Error message if invalid
    pub error: Option<String>,
}

/// Action signing manager
pub struct ActionSigner {
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
    session_id: String,
    sequence: u64,
    last_hash: Option<String>,
    intent_id: Option<String>,
    /// Replay protection: track seen action hashes with timestamps
    seen_actions: std::collections::HashMap<String, f64>, // hash -> timestamp
    /// Replay protection configuration
    replay_config: ReplayProtectionConfig,
}

impl ActionSigner {
    /// Create a new action signer with a keypair
    pub fn new(private_key_hex: &str, session_id: String) -> Result<Self, String> {
        let bytes = hex::decode(private_key_hex)
            .map_err(|e| format!("Invalid hex: {}", e))?;
        let array: [u8; 32] = bytes.as_slice()
            .try_into()
            .map_err(|_| "Invalid key length (expected 32 bytes)")?;

        let signing_key = SigningKey::from_bytes(&array);
        let verifying_key = signing_key.verifying_key();

        Ok(ActionSigner {
            signing_key,
            verifying_key,
            session_id,
            sequence: 0,
            last_hash: None,
            intent_id: None,
            seen_actions: std::collections::HashMap::new(),
            replay_config: ReplayProtectionConfig {
                max_age_seconds: Some(300.0), // 5 minutes default
                reject_future: Some(true),
                clock_skew_tolerance: Some(60.0), // 1 minute tolerance
            },
        })
    }

    /// Configure replay protection
    pub fn set_replay_config(&mut self, config: ReplayProtectionConfig) {
        self.replay_config = config;
    }

    /// Check for replay attacks
    /// Returns Ok(()) if not a replay, Err(reason) if replay detected
    pub fn check_replay(&self, action: &SignedAction) -> Result<(), String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();

        // Get config values with defaults
        let max_age = self.replay_config.max_age_seconds.unwrap_or(300.0);
        let reject_future = self.replay_config.reject_future.unwrap_or(true);
        let skew_tolerance = self.replay_config.clock_skew_tolerance.unwrap_or(60.0);

        // Check 1: Timestamp in the future
        if reject_future && action.timestamp > now + skew_tolerance {
            return Err(format!(
                "Future timestamp detected: action timestamp {} is more than {} seconds in the future",
                action.timestamp, skew_tolerance
            ));
        }

        // Check 2: Action too old
        let action_age = now - action.timestamp;
        if action_age > max_age {
            return Err(format!(
                "Action too old: {} seconds (max allowed: {})",
                action_age, max_age
            ));
        }

        // Check 3: Duplicate action hash (replay attack)
        if let Some(&original_timestamp) = self.seen_actions.get(&action.hash) {
            // Allow if it's the same action being verified again within tolerance
            let time_diff = (action.timestamp - original_timestamp).abs();
            if time_diff > skew_tolerance {
                return Err(format!(
                    "Replay attack detected: action hash {} was already used at timestamp {}",
                    action.hash, original_timestamp
                ));
            }
        }

        Ok(())
    }

    /// Record an action as seen (for replay detection)
    pub fn record_action(&mut self, action: &SignedAction) {
        self.seen_actions.insert(action.hash.clone(), action.timestamp);
    }

    /// Clean up old entries from seen_actions (call periodically)
    pub fn cleanup_seen_actions(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();
        let max_age = self.replay_config.max_age_seconds.unwrap_or(300.0);

        self.seen_actions.retain(|_, timestamp| {
            now - *timestamp < max_age
        });
    }

    /// Set the intent ID for all subsequent actions
    pub fn set_intent(&mut self, intent_id: String) {
        self.intent_id = Some(intent_id);
    }

    /// Sign an action before execution
    pub fn sign_action(
        &mut self,
        tool: String,
        domain: String,
        action_type: String,
        target: Option<String>,
        params: &str,
    ) -> Result<SignedAction, String> {
        self.sequence += 1;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();

        // Hash parameters (don't store raw params for security)
        let params_hash = Self::hash_params(params);

        // Generate action ID
        let id = format!("action-{}-{}", self.session_id, self.sequence);

        // Generate random nonce for replay protection
        let nonce = Self::generate_nonce();

        // Create unsigned action for signing
        let mut action = SignedAction {
            id: id.clone(),
            sequence: self.sequence as f64,
            session_id: self.session_id.clone(),
            tool,
            domain,
            action_type,
            target,
            params_hash,
            timestamp,
            intent_id: self.intent_id.clone(),
            signature: String::new(),
            signed_by: hex::encode(self.verifying_key.as_bytes()),
            prev_hash: self.last_hash.clone(),
            hash: String::new(),
            nonce: nonce.clone(),
        };

        // Compute hash (includes prev_hash and nonce for chain and replay protection)
        action.hash = Self::compute_hash(&action);

        // Check for replay before signing
        self.check_replay(&action)?;

        // Sign the action
        let canonical = Self::canonicalize(&action);
        let signature = self.signing_key.sign(canonical.as_bytes());
        action.signature = BASE64.encode(signature.to_bytes());

        // Record action for replay detection
        self.record_action(&action);

        // Update chain
        self.last_hash = Some(action.hash.clone());

        Ok(action)
    }

    /// Generate a random nonce
    fn generate_nonce() -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let nonce_bytes: [u8; 16] = rng.gen();
        hex::encode(nonce_bytes)
    }

    /// Verify a signed action
    pub fn verify(&self, action: &SignedAction) -> ActionVerification {
        let mut errors = Vec::new();

        // Verify signature
        let signature_valid = self.verify_signature(action);
        if !signature_valid {
            errors.push("Invalid signature".to_string());
        }

        // Verify hash
        let expected_hash = Self::compute_hash(action);
        let hash_valid = action.hash == expected_hash;
        if !hash_valid {
            errors.push("Hash mismatch - action may have been tampered".to_string());
        }

        // Verify chain
        let chain_intact = if self.sequence > 1 {
            action.prev_hash.is_some()
        } else {
            true // First action has no prev
        };
        if !chain_intact {
            errors.push("Chain broken - missing previous hash".to_string());
        }

        // Verify intent
        let intent_verified = self.intent_id.is_none() ||
            action.intent_id == self.intent_id;
        if !intent_verified {
            errors.push("Intent ID mismatch".to_string());
        }

        let valid = errors.is_empty();

        ActionVerification {
            signature_valid,
            chain_intact,
            hash_valid,
            intent_verified,
            valid,
            error: if errors.is_empty() { None } else { Some(errors.join("; ")) },
        }
    }

    fn verify_signature(&self, action: &SignedAction) -> bool {
        let signature_bytes = match BASE64.decode(&action.signature) {
            Ok(b) => b,
            Err(_) => return false,
        };

        let signature = match Signature::from_slice(&signature_bytes) {
            Ok(s) => s,
            Err(_) => return false,
        };

        let canonical = Self::canonicalize(action);
        self.verifying_key.verify(canonical.as_bytes(), &signature).is_ok()
    }

    fn hash_params(params: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(params.as_bytes());
        hex::encode(hasher.finalize())
    }

    fn compute_hash(action: &SignedAction) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(action.id.as_bytes());
        hasher.update(action.sequence.to_be_bytes());
        hasher.update(action.session_id.as_bytes());
        hasher.update(action.tool.as_bytes());
        hasher.update(action.domain.as_bytes());
        hasher.update(action.action_type.as_bytes());
        hasher.update(action.params_hash.as_bytes());
        hasher.update(action.timestamp.to_be_bytes());
        hasher.update(action.nonce.as_bytes()); // Include nonce in hash
        if let Some(ref intent) = action.intent_id {
            hasher.update(intent.as_bytes());
        }
        if let Some(ref prev) = action.prev_hash {
            hasher.update(prev.as_bytes());
        }
        hex::encode(hasher.finalize())
    }

    fn canonicalize(action: &SignedAction) -> String {
        // Create canonical representation for signing (excluding signature field)
        serde_json::json!({
            "id": action.id,
            "sequence": action.sequence,
            "session_id": action.session_id,
            "tool": action.tool,
            "domain": action.domain,
            "action_type": action.action_type,
            "target": action.target,
            "params_hash": action.params_hash,
            "timestamp": action.timestamp,
            "intent_id": action.intent_id,
            "prev_hash": action.prev_hash,
            "hash": action.hash,
            "nonce": action.nonce,
        }).to_string()
    }

    /// Get the current sequence number
    pub fn sequence(&self) -> u64 {
        self.sequence
    }

    /// Get the session ID
    pub fn session_id(&self) -> &str {
        &self.session_id
    }

    /// Get the public key
    pub fn public_key(&self) -> String {
        hex::encode(self.verifying_key.as_bytes())
    }
}

// NAPI bindings

/// Create an action signer
#[napi_derive::napi]
pub fn create_action_signer(
    private_key_hex: String,
    session_id: String,
) -> napi::Result<ActionSignerHandle> {
    ActionSigner::new(&private_key_hex, session_id)
        .map(|signer| ActionSignerHandle { signer })
        .map_err(|e| napi::Error::from_reason(e))
}

/// Handle for action signer
#[napi]
pub struct ActionSignerHandle {
    signer: ActionSigner,
}

#[napi]
impl ActionSignerHandle {
    /// Sign an action
    #[napi]
    pub fn sign(
        &mut self,
        tool: String,
        domain: String,
        action_type: String,
        target: Option<String>,
        params: String,
    ) -> napi::Result<SignedAction> {
        self.signer.sign_action(tool, domain, action_type, target, &params)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Verify a signed action
    #[napi]
    pub fn verify(&self, action: SignedAction) -> ActionVerification {
        self.signer.verify(&action)
    }

    /// Set intent ID
    #[napi]
    pub fn set_intent(&mut self, intent_id: String) {
        self.signer.set_intent(intent_id);
    }

    /// Get current sequence
    #[napi]
    pub fn sequence(&self) -> f64 {
        self.signer.sequence() as f64
    }

    /// Get session ID
    #[napi]
    pub fn session_id(&self) -> String {
        self.signer.session_id().to_string()
    }

    /// Get public key
    #[napi]
    pub fn public_key(&self) -> String {
        self.signer.public_key()
    }
}

/// Verify a signed action without a signer handle (using public key)
#[napi_derive::napi]
pub fn verify_signed_action(action: SignedAction, public_key_hex: String) -> napi::Result<ActionVerification> {
    let bytes = hex::decode(&public_key_hex)
        .map_err(|e| napi::Error::from_reason(format!("Invalid hex: {}", e)))?;
    let array: [u8; 32] = bytes.as_slice()
        .try_into()
        .map_err(|_| napi::Error::from_reason("Invalid key length"))?;

    let verifying_key = VerifyingKey::from_bytes(&array)
        .map_err(|e| napi::Error::from_reason(format!("Invalid public key: {}", e)))?;

    // Verify signature
    let signature_valid = {
        let signature_bytes = match BASE64.decode(&action.signature) {
            Ok(b) => b,
            Err(_) => return Ok(ActionVerification {
                signature_valid: false,
                chain_intact: false,
                hash_valid: false,
                intent_verified: false,
                valid: false,
                error: Some("Invalid signature encoding".to_string()),
            }),
        };

        let signature = match Signature::from_slice(&signature_bytes) {
            Ok(s) => s,
            Err(_) => return Ok(ActionVerification {
                signature_valid: false,
                chain_intact: false,
                hash_valid: false,
                intent_verified: false,
                valid: false,
                error: Some("Invalid signature format".to_string()),
            }),
        };

        let canonical = ActionSigner::canonicalize(&action);
        verifying_key.verify(canonical.as_bytes(), &signature).is_ok()
    };

    // Verify hash
    let hash_valid = action.hash == ActionSigner::compute_hash(&action);

    let valid = signature_valid && hash_valid;

    Ok(ActionVerification {
        signature_valid,
        chain_intact: action.prev_hash.is_some() || action.sequence == 1.0,
        hash_valid,
        intent_verified: true, // Can't verify without context
        valid,
        error: if valid { None } else { Some("Verification failed".to_string()) },
    })
}

// Expose internal methods for verification
impl ActionSigner {
    pub fn canonicalize_public(action: &SignedAction) -> String {
        Self::canonicalize(action)
    }

    pub fn compute_hash_public(action: &SignedAction) -> String {
        Self::compute_hash(action)
    }
}
