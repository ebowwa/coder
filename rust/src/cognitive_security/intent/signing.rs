//! Cryptographic signing for intent verification
//!
//! Uses Ed25519 for fast, secure signatures.
//! The agent's core intent is signed and cannot be modified
//! without detection.

use super::{AgentIntent, IntegrityResult};
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey, KEYPAIR_LENGTH};
use rand::rngs::OsRng;
use serde::Serialize;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// Generate a new Ed25519 keypair for signing intents
#[napi_derive::napi]
pub fn generate_intent_keypair() -> IntentKeypair {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    IntentKeypair {
        private_key: hex::encode(signing_key.as_bytes()),
        public_key: hex::encode(verifying_key.as_bytes()),
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[napi(object)]
pub struct IntentKeypair {
    /// Private key (hex encoded) - KEEP SECRET
    pub private_key: String,
    /// Public key (hex encoded) - can be shared
    pub public_key: String,
}

/// Sign an agent intent with a private key
#[napi_derive::napi]
pub fn sign_intent(mut intent: AgentIntent, private_key_hex: String) -> napi::Result<AgentIntent> {
    // Parse private key
    let private_key_bytes = hex::decode(&private_key_hex)
        .map_err(|e| napi::Error::from_reason(format!("Invalid private key hex: {}", e)))?;

    let signing_key = SigningKey::from_bytes(
        private_key_bytes
            .as_slice()
            .try_into()
            .map_err(|_| napi::Error::from_reason("Invalid private key length"))?,
    );

    // Create canonical representation for signing
    // We sign everything EXCEPT the signature field itself
    let canonical = canonicalize_for_signing(&intent)?;

    // Sign
    let signature = signing_key.sign(canonical.as_bytes());
    let signature_b64 = BASE64.encode(signature.to_bytes());

    // Attach signature and public key
    intent.signature = Some(signature_b64);
    intent.signed_by = Some(hex::encode(signing_key.verifying_key().as_bytes()));
    intent.id = generate_intent_id(&intent);

    Ok(intent)
}

/// Verify an intent's signature
#[napi_derive::napi]
pub fn verify_intent_signature(intent: &AgentIntent) -> IntegrityResult {
    // Check if signature exists
    let signature_b64 = match &intent.signature {
        Some(s) => s.clone(),
        None => {
            return IntegrityResult {
                valid: false,
                error: Some("No signature present".to_string()),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    // Check if public key exists
    let public_key_hex = match &intent.signed_by {
        Some(pk) => pk.clone(),
        None => {
            return IntegrityResult {
                valid: false,
                error: Some("No public key present".to_string()),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    // Parse public key
    let public_key_bytes = match hex::decode(&public_key_hex) {
        Ok(bytes) => bytes,
        Err(e) => {
            return IntegrityResult {
                valid: false,
                error: Some(format!("Invalid public key hex: {}", e)),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    let verifying_key = match VerifyingKey::from_bytes(
        public_key_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Invalid public key length"),
    ) {
        Ok(key) => key,
        Err(e) => {
            return IntegrityResult {
                valid: false,
                error: Some(format!("Invalid public key: {}", e)),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    // Parse signature
    let signature_bytes = match BASE64.decode(&signature_b64) {
        Ok(bytes) => bytes,
        Err(e) => {
            return IntegrityResult {
                valid: false,
                error: Some(format!("Invalid signature encoding: {}", e)),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    let signature = match Signature::from_slice(&signature_bytes) {
        Ok(sig) => sig,
        Err(e) => {
            return IntegrityResult {
                valid: false,
                error: Some(format!("Invalid signature: {}", e)),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    // Get canonical representation
    let canonical = match canonicalize_for_signing(intent) {
        Ok(c) => c,
        Err(e) => {
            return IntegrityResult {
                valid: false,
                error: Some(format!("Failed to canonicalize: {}", e)),
                signature_valid: false,
                content_intact: false,
                expired: false,
            };
        }
    };

    // Verify
    match verifying_key.verify(canonical.as_bytes(), &signature) {
        Ok(()) => IntegrityResult {
            valid: true,
            error: None,
            signature_valid: true,
            content_intact: true,
            expired: false,
        },
        Err(_) => IntegrityResult {
            valid: false,
            error: Some("Signature verification failed - content may have been tampered".to_string()),
            signature_valid: false,
            content_intact: false,
            expired: false,
        },
    }
}

/// Create a deterministic canonical representation for signing
/// Excludes signature field to allow signing
fn canonicalize_for_signing(intent: &AgentIntent) -> napi::Result<String> {
    // Create a copy without signature for signing
    let for_signing = SignedIntentForSigning {
        id: &intent.id,
        version: intent.version,
        identity: &intent.identity,
        purpose: &intent.purpose,
        principles: &intent.principles,
        created_at: intent.created_at,
    };

    serde_json::to_string(&for_signing)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize: {}", e)))
}

/// Generate a deterministic ID for an intent
fn generate_intent_id(intent: &AgentIntent) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    intent.version.hash(&mut hasher);
    intent.identity.name.hash(&mut hasher);
    intent.created_at.hash(&mut hasher);

    format!("intent-{:016x}", hasher.finish())
}

/// Helper struct for canonical serialization (excludes signature)
#[derive(Serialize)]
struct SignedIntentForSigning<'a> {
    id: &'a str,
    version: u32,
    identity: &'a super::AgentIdentity,
    purpose: &'a super::AgentPurpose,
    principles: &'a super::AgentPrinciples,
    created_at: u64,
}

/// Extract the canonical hash of an intent (for comparison/verification)
#[napi_derive::napi]
pub fn hash_intent(intent: &AgentIntent) -> String {
    use sha2::{Sha256, Digest};

    let canonical = canonicalize_for_signing(intent).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    hex::encode(hasher.finalize())
}

/// Compare two intents to see if they represent the same core intent
/// (ignoring signature differences)
#[napi_derive::napi]
pub fn intents_equivalent(intent1: &AgentIntent, intent2: &AgentIntent) -> bool {
    // Compare canonical representations
    let hash1 = hash_intent(intent1);
    let hash2 = hash_intent(intent2);
    hash1 == hash2
}
