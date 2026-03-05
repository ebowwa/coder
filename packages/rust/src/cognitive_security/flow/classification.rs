//! Data Classification
//!
//! Classifies data based on content patterns, sources, and metadata.
//! Supports automatic detection of sensitive data types.

use super::{SensitivityLevel, DataCategory, ClassifiedData};
use std::collections::HashMap;
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Data classifier with pattern matching
pub struct DataClassifier {
    /// Patterns for detecting sensitive data
    patterns: Vec<ClassificationPattern>,

    /// Source-based classification rules
    source_rules: HashMap<String, SensitivityLevel>,

    /// Category detection patterns
    category_patterns: HashMap<DataCategory, Vec<Regex>>,

    /// Default sensitivity for unknown data
    default_sensitivity: SensitivityLevel,
}

impl Default for DataClassifier {
    fn default() -> Self {
        Self::new()
    }
}

impl DataClassifier {
    pub fn new() -> Self {
        let mut classifier = DataClassifier {
            patterns: Vec::new(),
            source_rules: HashMap::new(),
            category_patterns: HashMap::new(),
            default_sensitivity: SensitivityLevel::Internal,
        };

        classifier.register_default_patterns();
        classifier.register_default_source_rules();
        classifier
    }

    fn register_default_patterns(&mut self) {
        // PII patterns
        self.add_category_pattern(DataCategory::Pii, r"\b\d{3}-\d{2}-\d{4}\b"); // SSN
        self.add_category_pattern(DataCategory::Pii, r"\b\d{16}\b"); // Credit card
        self.add_category_pattern(DataCategory::Pii, r"\b[A-Z]{2}\d{6,9}\b"); // Passport
        self.add_category_pattern(DataCategory::Pii, r"\b[\w\.-]+@[\w\.-]+\.\w+\b"); // Email
        self.add_category_pattern(DataCategory::Pii, r"\b\+?1?\d{10,15}\b"); // Phone

        // Credentials patterns
        self.add_category_pattern(DataCategory::Credentials, r"(?i)password\s*[=:]\s*\S+");
        self.add_category_pattern(DataCategory::Credentials, r"(?i)api[_-]?key\s*[=:]\s*\S+");
        self.add_category_pattern(DataCategory::Credentials, r"(?i)secret[_-]?key\s*[=:]\s*\S+");
        self.add_category_pattern(DataCategory::Credentials, r"(?i)token\s*[=:]\s*\S+");
        self.add_category_pattern(DataCategory::Credentials, r"-----BEGIN.*PRIVATE KEY-----");
        self.add_category_pattern(DataCategory::Credentials, r"sk-[a-zA-Z0-9]{20,}");

        // Financial patterns
        self.add_category_pattern(DataCategory::Financial, r"\$[\d,]+\.\d{2}");
        self.add_category_pattern(DataCategory::Financial, r"(?i)account\s*number\s*[:=]?\s*\d+");
        self.add_category_pattern(DataCategory::Financial, r"\b\d{8,17}\b"); // Bank account

        // Secrets patterns
        self.add_category_pattern(DataCategory::Secrets, r"xox[baprs]-[a-zA-Z0-9-]+"); // Slack
        self.add_category_pattern(DataCategory::Secrets, r"AKIA[A-Z0-9]{16}"); // AWS
        self.add_category_pattern(DataCategory::Secrets, r"ghp_[a-zA-Z0-9]{36}"); // GitHub
        self.add_category_pattern(DataCategory::Secrets, r"github_pat_[a-zA-Z0-9_]+");

        // Register classification patterns with sensitivity levels
        self.add_pattern(ClassificationPattern {
            name: "ssn".to_string(),
            pattern: r"\b\d{3}-\d{2}-\d{4}\b".to_string(),
            category: DataCategory::Pii,
            sensitivity: SensitivityLevel::Confidential,
            confidence: 0.9,
        });

        self.add_pattern(ClassificationPattern {
            name: "credit_card".to_string(),
            pattern: r"\b(?:\d{4}[-\s]?){3}\d{4}\b".to_string(),
            category: DataCategory::Financial,
            sensitivity: SensitivityLevel::Confidential,
            confidence: 0.85,
        });

        self.add_pattern(ClassificationPattern {
            name: "private_key".to_string(),
            pattern: r"-----BEGIN.*PRIVATE KEY-----".to_string(),
            category: DataCategory::Credentials,
            sensitivity: SensitivityLevel::Secret,
            confidence: 0.95,
        });

        self.add_pattern(ClassificationPattern {
            name: "api_key".to_string(),
            pattern: "(?i)(?:api[_-]?key|apikey)\\s*[=:]\\s*['\"]?\\S+['\"]?".to_string(),
            category: DataCategory::Secrets,
            sensitivity: SensitivityLevel::Secret,
            confidence: 0.8,
        });

        self.add_pattern(ClassificationPattern {
            name: "env_file".to_string(),
            pattern: r"(?i)\.env(?:\.\w+)?".to_string(),
            category: DataCategory::Configuration,
            sensitivity: SensitivityLevel::Confidential,
            confidence: 0.7,
        });
    }

    fn register_default_source_rules(&mut self) {
        // Environment variables are typically sensitive
        self.source_rules.insert("env".to_string(), SensitivityLevel::Confidential);
        self.source_rules.insert("environment".to_string(), SensitivityLevel::Confidential);

        // Secrets managers
        self.source_rules.insert("vault".to_string(), SensitivityLevel::Secret);
        self.source_rules.insert("secrets".to_string(), SensitivityLevel::Secret);
        self.source_rules.insert("credentials".to_string(), SensitivityLevel::Secret);

        // User input
        self.source_rules.insert("user_input".to_string(), SensitivityLevel::Internal);
        self.source_rules.insert("api_response".to_string(), SensitivityLevel::Internal);

        // Public sources
        self.source_rules.insert("public_api".to_string(), SensitivityLevel::Public);
        self.source_rules.insert("web".to_string(), SensitivityLevel::Public);
    }

    fn add_category_pattern(&mut self, category: DataCategory, pattern: &str) {
        if let Ok(re) = Regex::new(pattern) {
            self.category_patterns
                .entry(category)
                .or_insert_with(Vec::new)
                .push(re);
        }
    }

    fn add_pattern(&mut self, pattern: ClassificationPattern) {
        self.patterns.push(pattern);
    }

    /// Set default sensitivity for unknown data
    pub fn set_default_sensitivity(&mut self, level: SensitivityLevel) {
        self.default_sensitivity = level;
    }

    /// Add source-based classification rule
    pub fn add_source_rule(&mut self, source: &str, level: SensitivityLevel) {
        self.source_rules.insert(source.to_lowercase(), level);
    }

    /// Classify data based on content and source
    pub fn classify(&self, content: &str, source: &str, tags: Vec<String>) -> ClassifiedData {
        let mut detected_sensitivity = self.default_sensitivity;
        let mut detected_category = DataCategory::Generic;
        let mut confidence: f64 = 0.5;

        // Check source-based rules first
        let source_lower = source.to_lowercase();
        if let Some(&level) = self.source_rules.get(&source_lower) {
            detected_sensitivity = level;
            confidence = 0.9;
        }

        // Check content patterns
        for pattern in &self.patterns {
            if let Ok(re) = Regex::new(&pattern.pattern) {
                if re.is_match(content) {
                    if pattern.sensitivity > detected_sensitivity {
                        detected_sensitivity = pattern.sensitivity;
                        detected_category = pattern.category.clone();
                        confidence = confidence.max(pattern.confidence);
                    }
                }
            }
        }

        // Check category patterns
        for (category, patterns) in &self.category_patterns {
            for re in patterns {
                if re.is_match(content) {
                    detected_category = category.clone();
                    if *category == DataCategory::Credentials || *category == DataCategory::Secrets {
                        detected_sensitivity = detected_sensitivity.max(SensitivityLevel::Secret);
                    } else if *category == DataCategory::Pii || *category == DataCategory::Financial {
                        detected_sensitivity = detected_sensitivity.max(SensitivityLevel::Confidential);
                    }
                    break;
                }
            }
        }

        // Check tags for sensitivity hints
        for tag in &tags {
            let tag_lower = tag.to_lowercase();
            if tag_lower.contains("secret") || tag_lower.contains("credential") {
                detected_sensitivity = detected_sensitivity.max(SensitivityLevel::Secret);
            } else if tag_lower.contains("confidential") || tag_lower.contains("sensitive") {
                detected_sensitivity = detected_sensitivity.max(SensitivityLevel::Confidential);
            } else if tag_lower.contains("internal") {
                detected_sensitivity = detected_sensitivity.max(SensitivityLevel::Internal);
            } else if tag_lower.contains("public") {
                // Public tag can downgrade if no other sensitive data detected
                if detected_sensitivity == SensitivityLevel::Internal {
                    detected_sensitivity = SensitivityLevel::Public;
                }
            }
        }

        ClassifiedData {
            id: generate_data_id(),
            sensitivity: detected_sensitivity.name().to_lowercase(),
            category: format!("{:?}", detected_category).to_lowercase(),
            source: source.to_string(),
            tags,
            can_log: detected_sensitivity <= SensitivityLevel::Internal,
            can_transmit: detected_sensitivity <= SensitivityLevel::Internal,
            can_store: true,
            expires_at: None,
            created_at: current_timestamp(),
        }
    }

    /// Quick check if content contains sensitive data
    pub fn contains_sensitive(&self, content: &str) -> bool {
        for pattern in &self.patterns {
            if let Ok(re) = Regex::new(&pattern.pattern) {
                if re.is_match(content) {
                    return true;
                }
            }
        }
        false
    }

    /// Detect categories in content
    pub fn detect_categories(&self, content: &str) -> Vec<DataCategory> {
        let mut categories = Vec::new();

        for (category, patterns) in &self.category_patterns {
            for re in patterns {
                if re.is_match(content) {
                    categories.push(category.clone());
                    break;
                }
            }
        }

        categories
    }

    /// Get sensitivity level from string
    pub fn parse_sensitivity(s: &str) -> SensitivityLevel {
        match s.to_uppercase().as_str() {
            "PUBLIC" => SensitivityLevel::Public,
            "INTERNAL" => SensitivityLevel::Internal,
            "CONFIDENTIAL" => SensitivityLevel::Confidential,
            "SECRET" => SensitivityLevel::Secret,
            "TOP_SECRET" | "TOPSECRET" => SensitivityLevel::TopSecret,
            _ => SensitivityLevel::Internal,
        }
    }
}

/// Pattern for classifying data
#[derive(Debug, Clone)]
pub struct ClassificationPattern {
    /// Pattern name
    pub name: String,

    /// Regex pattern
    pub pattern: String,

    /// Category when matched
    pub category: DataCategory,

    /// Sensitivity level when matched
    pub sensitivity: SensitivityLevel,

    /// Confidence of this classification
    pub confidence: f64,
}

fn generate_data_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let mut hasher = DefaultHasher::new();
    now.hash(&mut hasher);

    format!("data-{:016x}", hasher.finish())
}

fn current_timestamp() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

/// Create a new data classifier
#[napi_derive::napi]
pub fn create_data_classifier() -> DataClassifierHandle {
    DataClassifierHandle {
        classifier: DataClassifier::new(),
    }
}

/// Handle for data classifier
#[napi]
pub struct DataClassifierHandle {
    classifier: DataClassifier,
}

#[napi]
impl DataClassifierHandle {
    /// Classify data
    #[napi]
    pub fn classify(
        &self,
        content: String,
        source: String,
        tags: Vec<String>,
    ) -> ClassifiedData {
        self.classifier.classify(&content, &source, tags)
    }

    /// Check if content contains sensitive data
    #[napi]
    pub fn contains_sensitive(&self, content: String) -> bool {
        self.classifier.contains_sensitive(&content)
    }

    /// Detect categories in content
    #[napi]
    pub fn detect_categories(&self, content: String) -> Vec<String> {
        self.classifier
            .detect_categories(&content)
            .into_iter()
            .map(|c| format!("{:?}", c).to_lowercase())
            .collect()
    }

    /// Set default sensitivity
    #[napi]
    pub fn set_default_sensitivity(&mut self, level: String) {
        let sensitivity = DataClassifier::parse_sensitivity(&level);
        self.classifier.set_default_sensitivity(sensitivity);
    }

    /// Add source rule
    #[napi]
    pub fn add_source_rule(&mut self, source: String, level: String) {
        let sensitivity = DataClassifier::parse_sensitivity(&level);
        self.classifier.add_source_rule(&source, sensitivity);
    }
}

/// Quick classify data without creating a classifier
#[napi_derive::napi]
pub fn classify_data(
    content: String,
    source: String,
    tags: Vec<String>,
) -> ClassifiedData {
    let classifier = DataClassifier::new();
    classifier.classify(&content, &source, tags)
}

/// Quick check for sensitive content
#[napi_derive::napi]
pub fn contains_sensitive_data(content: String) -> bool {
    let classifier = DataClassifier::new();
    classifier.contains_sensitive(&content)
}

/// Redact sensitive content
#[napi_derive::napi]
pub fn redact_sensitive(content: String, replacement: Option<String>) -> String {
    let _repl = replacement.unwrap_or_else(|| "[REDACTED]".to_string());
    let mut result = content;

    // Patterns to redact
    let patterns = [
        (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
        (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "CC"),
        (r"-----BEGIN.*PRIVATE KEY-----[\s\S]*?-----END.*PRIVATE KEY-----", "KEY"),
        (r"(?i)(?:password|passwd|pwd)\s*[=:]\s*\S+", "PWD"),
        (r"(?i)(?:api[_-]?key|apikey)\s*[=:]\s*\S+", "API_KEY"),
        (r"sk-[a-zA-Z0-9]{20,}", "API_KEY"),
        (r"AKIA[A-Z0-9]{16}", "AWS_KEY"),
    ];

    for (pattern, label) in patterns {
        if let Ok(re) = Regex::new(pattern) {
            let redacted = format!("[REDACTED:{}]", label);
            result = re.replace_all(&result, redacted.as_str()).to_string();
        }
    }

    result
}

/// Get all sensitivity levels
#[napi_derive::napi]
pub fn get_sensitivity_levels() -> Vec<SensitivityLevelInfo> {
    vec![
        SensitivityLevelInfo { name: "public".to_string(), value: 0.0, description: "Public information, no restrictions".to_string() },
        SensitivityLevelInfo { name: "internal".to_string(), value: 1.0, description: "Internal use, shouldn't leave organization".to_string() },
        SensitivityLevelInfo { name: "confidential".to_string(), value: 2.0, description: "Confidential, need-to-know basis".to_string() },
        SensitivityLevelInfo { name: "secret".to_string(), value: 3.0, description: "Secret, highly restricted".to_string() },
        SensitivityLevelInfo { name: "top_secret".to_string(), value: 4.0, description: "Top secret, maximum restriction".to_string() },
    ]
}

/// Get all data categories
#[napi_derive::napi]
pub fn get_data_categories() -> Vec<DataCategoryInfo> {
    vec![
        DataCategoryInfo { name: "pii".to_string(), description: "Personal identifiable information".to_string() },
        DataCategoryInfo { name: "financial".to_string(), description: "Financial data".to_string() },
        DataCategoryInfo { name: "credentials".to_string(), description: "Authentication credentials".to_string() },
        DataCategoryInfo { name: "secrets".to_string(), description: "API keys and secrets".to_string() },
        DataCategoryInfo { name: "source_code".to_string(), description: "Source code".to_string() },
        DataCategoryInfo { name: "configuration".to_string(), description: "Configuration data".to_string() },
        DataCategoryInfo { name: "logs".to_string(), description: "Logs and telemetry".to_string() },
        DataCategoryInfo { name: "user_content".to_string(), description: "User content".to_string() },
        DataCategoryInfo { name: "system_data".to_string(), description: "System data".to_string() },
        DataCategoryInfo { name: "network_data".to_string(), description: "Network data".to_string() },
        DataCategoryInfo { name: "generic".to_string(), description: "Generic/uncategorized".to_string() },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct SensitivityLevelInfo {
    pub name: String,
    pub value: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DataCategoryInfo {
    pub name: String,
    pub description: String,
}
