//! Leak Prevention Module
//!
//! Detects and blocks potential data exfiltration channels.
//! Implements DLP (Data Loss Prevention) patterns for AI agents.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Leak prevention engine
pub struct LeakPreventionEngine {
    /// Blocked data patterns
    blocked_patterns: Vec<BlockedPattern>,

    /// Allowed egress channels
    allowed_channels: HashSet<String>,

    /// Sensitive data cache (for detection)
    sensitive_data_hashes: HashSet<String>,

    /// Prevention statistics
    stats: PreventionStats,

    /// Whether to block or just alert
    enforcement_mode: EnforcementMode,
}

/// A pattern that indicates potential data leak
#[derive(Debug, Clone)]
pub struct BlockedPattern {
    /// Pattern name
    pub name: String,

    /// Regex pattern
    pub pattern: String,

    /// Category of leak
    pub leak_type: LeakType,

    /// Severity
    pub severity: f64,
}

/// Type of data leak
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[napi(string_enum)]
pub enum LeakType {
    /// Credentials in output
    CredentialExposure,
    /// PII in logs/transmissions
    PiiExposure,
    /// Secret keys in responses
    SecretKeyExposure,
    /// Internal URLs exposed
    InternalUrlExposure,
    /// Debug info leakage
    DebugInfoLeak,
    /// Stack trace exposure
    StackTraceExposure,
    /// Configuration exposure
    ConfigExposure,
    /// Source code leakage
    SourceCodeLeak,
    /// Encoded data smuggling
    EncodedSmuggling,
    /// Timing channel
    TimingChannel,
    /// Covert channel
    CovertChannel,
}

/// Enforcement mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnforcementMode {
    /// Block all violations
    Block,
    /// Alert but allow
    AlertOnly,
    /// Log only
    LogOnly,
}

/// Prevention statistics
#[derive(Debug, Clone, Default)]
struct PreventionStats {
    total_checks: f64,
    blocked_count: f64,
    alert_count: f64,
    by_leak_type: HashMap<String, f64>,
}

impl Default for LeakPreventionEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl LeakPreventionEngine {
    pub fn new() -> Self {
        let mut engine = LeakPreventionEngine {
            blocked_patterns: Vec::new(),
            allowed_channels: HashSet::new(),
            sensitive_data_hashes: HashSet::new(),
            stats: PreventionStats::default(),
            enforcement_mode: EnforcementMode::Block,
        };

        engine.register_default_patterns();
        engine.register_default_channels();
        engine
    }

    fn register_default_patterns(&mut self) {
        // Credential patterns
        self.add_blocked_pattern(BlockedPattern {
            name: "api_key_in_output".to_string(),
            pattern: "(?i)(?:api[_-]?key|apikey)\\s*[=:]\\s*['\"]?[\\w-]{20,}['\"]?".to_string(),
            leak_type: LeakType::CredentialExposure,
            severity: 1.0,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "password_in_output".to_string(),
            pattern: "(?i)(?:password|passwd|pwd)\\s*[=:]\\s*\\S{8,}".to_string(),
            leak_type: LeakType::CredentialExposure,
            severity: 1.0,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "private_key_block".to_string(),
            pattern: "-----BEGIN.*PRIVATE KEY-----".to_string(),
            leak_type: LeakType::SecretKeyExposure,
            severity: 1.0,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "aws_key".to_string(),
            pattern: "AKIA[A-Z0-9]{16}".to_string(),
            leak_type: LeakType::SecretKeyExposure,
            severity: 1.0,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "github_token".to_string(),
            pattern: r"ghp_[a-zA-Z0-9]{36}".to_string(),
            leak_type: LeakType::SecretKeyExposure,
            severity: 1.0,
        });

        // PII patterns
        self.add_blocked_pattern(BlockedPattern {
            name: "ssn_exposure".to_string(),
            pattern: r"\b\d{3}-\d{2}-\d{4}\b".to_string(),
            leak_type: LeakType::PiiExposure,
            severity: 0.9,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "credit_card_exposure".to_string(),
            pattern: r"\b(?:\d{4}[-\s]?){3}\d{4}\b".to_string(),
            leak_type: LeakType::PiiExposure,
            severity: 0.9,
        });

        // Debug/stack trace patterns
        self.add_blocked_pattern(BlockedPattern {
            name: "stack_trace".to_string(),
            pattern: r"at\s+[\w.]+\([^)]+:\d+:\d+\)".to_string(),
            leak_type: LeakType::StackTraceExposure,
            severity: 0.7,
        });

        self.add_blocked_pattern(BlockedPattern {
            name: "debug_info".to_string(),
            pattern: r"(?i)(?:debug|trace|verbose)\s*[:=]\s*(?:true|1|on)".to_string(),
            leak_type: LeakType::DebugInfoLeak,
            severity: 0.5,
        });

        // Internal URL patterns
        self.add_blocked_pattern(BlockedPattern {
            name: "internal_url".to_string(),
            pattern: r"(?i)https?://(?:internal|private|local|localhost|10\.|172\.|192\.168\.)[^\s]*".to_string(),
            leak_type: LeakType::InternalUrlExposure,
            severity: 0.6,
        });

        // Config patterns
        self.add_blocked_pattern(BlockedPattern {
            name: "env_exposure".to_string(),
            pattern: r"(?i)(?:database_url|db_password|secret_key|auth_token)\s*=".to_string(),
            leak_type: LeakType::ConfigExposure,
            severity: 0.95,
        });

        // Encoded smuggling detection
        self.add_blocked_pattern(BlockedPattern {
            name: "base64_smuggling".to_string(),
            pattern: r"(?:[A-Za-z0-9+/]{40,}={0,2})".to_string(),
            leak_type: LeakType::EncodedSmuggling,
            severity: 0.4,
        });
    }

    fn register_default_channels(&mut self) {
        // Default allowed channels
        self.allowed_channels.insert("stdout".to_string());
        self.allowed_channels.insert("stderr".to_string());
        self.allowed_channels.insert("file_write".to_string());
        self.allowed_channels.insert("api_response".to_string());
    }

    fn add_blocked_pattern(&mut self, pattern: BlockedPattern) {
        self.blocked_patterns.push(pattern);
    }

    /// Add an allowed egress channel
    pub fn add_allowed_channel(&mut self, channel: &str) {
        self.allowed_channels.insert(channel.to_lowercase());
    }

    /// Remove an allowed channel
    pub fn remove_allowed_channel(&mut self, channel: &str) {
        self.allowed_channels.remove(&channel.to_lowercase());
    }

    /// Set enforcement mode
    pub fn set_enforcement_mode(&mut self, mode: EnforcementMode) {
        self.enforcement_mode = mode;
    }

    /// Register sensitive data for tracking
    pub fn register_sensitive_data(&mut self, data: &str) {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        let hash = hex::encode(&hasher.finalize()[..8]);
        self.sensitive_data_hashes.insert(hash);
    }

    /// Check content for potential leaks
    pub fn check_content(&mut self, content: &str, channel: &str) -> LeakCheckResult {
        self.stats.total_checks += 1.0;

        let mut detections: Vec<LeakDetection> = Vec::new();
        let mut should_block = false;

        // Check blocked patterns
        for pattern in &self.blocked_patterns {
            if let Ok(re) = regex::Regex::new(&pattern.pattern) {
                if re.is_match(content) {
                    detections.push(LeakDetection {
                        pattern_name: pattern.name.clone(),
                        leak_type: pattern.leak_type,
                        severity: pattern.severity,
                        match_found: true,
                    });

                    if pattern.severity >= 0.8 {
                        should_block = true;
                    }

                    *self.stats.by_leak_type
                        .entry(format!("{:?}", pattern.leak_type))
                        .or_insert(0.0) += 1.0;
                }
            }
        }

        // Check for registered sensitive data
        for hash in &self.sensitive_data_hashes {
            // Simple check - in production would need proper substring hashing
            if content.contains(hash) {
                detections.push(LeakDetection {
                    pattern_name: "registered_sensitive".to_string(),
                    leak_type: LeakType::SecretKeyExposure,
                    severity: 1.0,
                    match_found: true,
                });
                should_block = true;
            }
        }

        // Check channel
        let channel_allowed = self.allowed_channels.contains(&channel.to_lowercase());

        // Determine action based on enforcement mode
        let action = match self.enforcement_mode {
            EnforcementMode::Block if should_block => {
                self.stats.blocked_count += 1.0;
                PreventionAction::Block
            }
            EnforcementMode::AlertOnly if !detections.is_empty() => {
                self.stats.alert_count += 1.0;
                PreventionAction::Alert
            }
            _ => PreventionAction::Allow,
        };

        LeakCheckResult {
            action,
            detections,
            channel_allowed,
            checked_at: current_timestamp(),
        }
    }

    /// Sanitize content by redacting sensitive data
    pub fn sanitize(&self, content: &str) -> String {
        let mut result = content.to_string();

        let redactions = [
            ("(?i)(api[_-]?key|apikey)\\s*[=:]\\s*\\S{10,}", "[REDACTED:API_KEY]"),
            ("(?i)(password|passwd|pwd)\\s*[=:]\\s*\\S{8,}", "[REDACTED:PASSWORD]"),
            ("AKIA[A-Z0-9]{16}", "[REDACTED:AWS_KEY]"),
            ("ghp_[a-zA-Z0-9]{36}", "[REDACTED:GITHUB_TOKEN]"),
            ("sk-[a-zA-Z0-9]{20,}", "[REDACTED:API_KEY]"),
            ("\\b\\d{3}-\\d{2}-\\d{4}\\b", "[REDACTED:SSN]"),
            ("\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b", "[REDACTED:CC]"),
            ("-----BEGIN.*PRIVATE KEY-----[\\s\\S]*?-----END.*PRIVATE KEY-----", "[REDACTED:KEY]"),
        ];

        for (pattern, replacement) in redactions {
            if let Ok(re) = regex::Regex::new(pattern) {
                result = re.replace_all(&result, replacement).to_string();
            }
        }

        result
    }

    /// Get prevention statistics
    pub fn stats(&self) -> PreventionStatsResult {
        PreventionStatsResult {
            total_checks: self.stats.total_checks,
            blocked_count: self.stats.blocked_count,
            alert_count: self.stats.alert_count,
            by_leak_type: self.stats.by_leak_type.clone(),
        }
    }

    /// Clear registered sensitive data
    pub fn clear_sensitive_data(&mut self) {
        self.sensitive_data_hashes.clear();
    }
}

fn current_timestamp() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

/// Result of leak check
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct LeakCheckResult {
    /// Action to take
    pub action: PreventionAction,
    /// Detections found
    pub detections: Vec<LeakDetection>,
    /// Whether the channel is allowed
    pub channel_allowed: bool,
    /// When the check was performed
    pub checked_at: f64,
}

/// Action to take
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[napi(string_enum)]
pub enum PreventionAction {
    Allow,
    Alert,
    Block,
}

/// A single leak detection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct LeakDetection {
    /// Pattern that matched
    pub pattern_name: String,
    /// Type of leak detected
    pub leak_type: LeakType,
    /// Severity of the leak
    pub severity: f64,
    /// Whether a match was found
    pub match_found: bool,
}

/// Prevention statistics result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct PreventionStatsResult {
    pub total_checks: f64,
    pub blocked_count: f64,
    pub alert_count: f64,
    pub by_leak_type: HashMap<String, f64>,
}

/// Create a leak prevention engine
#[napi_derive::napi]
pub fn create_leak_prevention() -> LeakPreventionHandle {
    LeakPreventionHandle {
        engine: LeakPreventionEngine::new(),
    }
}

/// Handle for leak prevention engine
#[napi]
pub struct LeakPreventionHandle {
    engine: LeakPreventionEngine,
}

#[napi]
impl LeakPreventionHandle {
    /// Check content for leaks
    #[napi]
    pub fn check(&mut self, content: String, channel: String) -> LeakCheckResult {
        self.engine.check_content(&content, &channel)
    }

    /// Sanitize content
    #[napi]
    pub fn sanitize(&self, content: String) -> String {
        self.engine.sanitize(&content)
    }

    /// Register sensitive data
    #[napi]
    pub fn register_sensitive(&mut self, data: String) {
        self.engine.register_sensitive_data(&data);
    }

    /// Add allowed channel
    #[napi]
    pub fn add_channel(&mut self, channel: String) {
        self.engine.add_allowed_channel(&channel);
    }

    /// Remove allowed channel
    #[napi]
    pub fn remove_channel(&mut self, channel: String) {
        self.engine.remove_allowed_channel(&channel);
    }

    /// Set enforcement mode
    #[napi]
    pub fn set_mode(&mut self, mode: String) {
        let enforcement_mode = match mode.to_lowercase().as_str() {
            "alert" | "alert_only" => EnforcementMode::AlertOnly,
            "log" | "log_only" => EnforcementMode::LogOnly,
            _ => EnforcementMode::Block,
        };
        self.engine.set_enforcement_mode(enforcement_mode);
    }

    /// Get statistics
    #[napi]
    pub fn stats(&self) -> PreventionStatsResult {
        self.engine.stats()
    }

    /// Clear sensitive data
    #[napi]
    pub fn clear_sensitive(&mut self) {
        self.engine.clear_sensitive_data();
    }
}

/// Quick check content for leaks
#[napi_derive::napi]
pub fn check_for_leaks(content: String, channel: String) -> LeakCheckResult {
    let mut engine = LeakPreventionEngine::new();
    engine.check_content(&content, &channel)
}

/// Quick sanitize content
#[napi_derive::napi]
pub fn sanitize_content(content: String) -> String {
    let engine = LeakPreventionEngine::new();
    engine.sanitize(&content)
}
