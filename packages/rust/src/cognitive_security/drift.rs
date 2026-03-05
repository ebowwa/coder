//! Drift Detection
//!
//! Behavioral analytics to detect when agent behavior deviates from
//! its original intent. Based on NIST AI RMF 2.0 behavioral monitoring.
//!
//! Key concept: Track action patterns over time and detect when
//! the agent's behavior drifts outside its intended scope.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};

use super::signed_action::SignedAction;

/// Behavioral profile of an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct BehavioralProfile {
    /// Agent/session identifier
    pub agent_id: String,

    /// Intent ID this profile is based on
    pub intent_id: Option<String>,

    /// When this profile was created
    pub created_at: f64,

    /// When this profile was last updated
    pub updated_at: f64,

    /// Total actions recorded
    pub total_actions: f64,

    /// Action type distribution
    pub action_types: HashMap<String, f64>,

    /// Domain distribution
    pub domains: HashMap<String, f64>,

    /// Tool usage distribution
    pub tools: HashMap<String, f64>,

    /// Average actions per minute
    pub actions_per_minute: f64,

    /// Time window for rate calculation (seconds)
    pub rate_window: f64,

    /// Most common action sequences (n-grams)
    pub common_sequences: Vec<SequencePattern>,

    /// Forbidden action attempts
    pub forbidden_attempts: f64,

    /// Approval requests
    pub approval_requests: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct SequencePattern {
    pub sequence: Vec<String>,
    pub count: f64,
    pub last_seen: f64,
}

/// Drift detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DriftResult {
    /// Overall drift score (0 = no drift, 1 = complete drift)
    pub drift_score: f64,

    /// Whether drift exceeds threshold
    pub drift_detected: bool,

    /// Specific drift indicators
    pub indicators: Vec<DriftIndicator>,

    /// Recommended action
    pub recommendation: String,

    /// Whether to block further actions
    pub should_block: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DriftIndicator {
    /// Type of drift detected
    pub indicator_type: String, // "action_shift", "domain_shift", "rate_anomaly", "sequence_anomaly", "forbidden_pattern"

    /// Severity (0-1)
    pub severity: f64,

    /// Description
    pub description: String,

    /// Contributing factor
    pub factor: String,

    /// Evidence (e.g., specific actions)
    pub evidence: Vec<String>,
}

/// Drift detector configuration
#[derive(Debug, Clone)]
pub struct DriftConfig {
    /// Threshold for drift detection (0-1)
    pub threshold: f64,

    /// Window size for recent actions (number of actions)
    pub window_size: usize,

    /// Minimum actions before drift detection
    pub min_actions: f64,

    /// Rate anomaly threshold (multiplier of baseline rate)
    pub rate_anomaly_threshold: f64,

    /// Action type shift threshold (KL divergence)
    pub action_shift_threshold: f64,

    /// Domain shift threshold
    pub domain_shift_threshold: f64,

    /// Enable sequence analysis
    pub analyze_sequences: bool,

    /// Maximum unique sequences to track
    pub max_sequences: usize,
}

impl Default for DriftConfig {
    fn default() -> Self {
        DriftConfig {
            threshold: 0.3,
            window_size: 100,
            min_actions: 10.0,
            rate_anomaly_threshold: 3.0,
            action_shift_threshold: 0.5,
            domain_shift_threshold: 0.4,
            analyze_sequences: true,
            max_sequences: 100,
        }
    }
}

/// Drift detector
pub struct DriftDetector {
    config: DriftConfig,
    profile: BehavioralProfile,
    recent_actions: VecDeque<SignedAction>,
    baseline_action_types: HashMap<String, f64>,
    baseline_domains: HashMap<String, f64>,
    sequences: HashMap<String, SequencePattern>,
    last_action_times: VecDeque<f64>,
}

impl DriftDetector {
    /// Create a new drift detector
    pub fn new(agent_id: String, intent_id: Option<String>) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64();

        DriftDetector {
            config: DriftConfig::default(),
            profile: BehavioralProfile {
                agent_id,
                intent_id,
                created_at: now,
                updated_at: now,
                total_actions: 0.0,
                action_types: HashMap::new(),
                domains: HashMap::new(),
                tools: HashMap::new(),
                actions_per_minute: 0.0,
                rate_window: 60.0,
                common_sequences: Vec::new(),
                forbidden_attempts: 0.0,
                approval_requests: 0.0,
            },
            recent_actions: VecDeque::with_capacity(100),
            baseline_action_types: HashMap::new(),
            baseline_domains: HashMap::new(),
            sequences: HashMap::new(),
            last_action_times: VecDeque::with_capacity(100),
        }
    }

    /// Set configuration
    pub fn with_config(mut self, config: DriftConfig) -> Self {
        self.config = config;
        self
    }

    /// Set baseline distributions (from initial intent)
    pub fn set_baseline(
        &mut self,
        action_types: HashMap<String, f64>,
        domains: HashMap<String, f64>,
    ) {
        self.baseline_action_types = action_types;
        self.baseline_domains = domains;
    }

    /// Record an action
    pub fn record_action(&mut self, action: &SignedAction) {
        let now = action.timestamp;

        // Update profile
        self.profile.total_actions += 1.0;
        self.profile.updated_at = now;

        // Update action type distribution
        *self.profile.action_types
            .entry(action.action_type.clone())
            .or_insert(0.0) += 1.0;

        // Update domain distribution
        *self.profile.domains
            .entry(action.domain.clone())
            .or_insert(0.0) += 1.0;

        // Update tool distribution
        *self.profile.tools
            .entry(action.tool.clone())
            .or_insert(0.0) += 1.0;

        // Track recent actions
        if self.recent_actions.len() >= self.config.window_size {
            self.recent_actions.pop_front();
        }
        self.recent_actions.push_back(action.clone());

        // Track action times for rate calculation
        self.last_action_times.push_back(now);

        // Update sequences
        if self.config.analyze_sequences && self.recent_actions.len() >= 2 {
            self.update_sequences();
        }

        // Update rate
        self.update_rate(now);
    }

    /// Record a forbidden attempt
    pub fn record_forbidden_attempt(&mut self) {
        self.profile.forbidden_attempts += 1.0;
    }

    /// Record an approval request
    pub fn record_approval_request(&mut self) {
        self.profile.approval_requests += 1.0;
    }

    /// Detect drift
    pub fn detect_drift(&self) -> DriftResult {
        let mut indicators = Vec::new();

        // Need minimum actions
        if self.profile.total_actions < self.config.min_actions {
            return DriftResult {
                drift_score: 0.0,
                drift_detected: false,
                indicators: vec![DriftIndicator {
                    indicator_type: "insufficient_data".to_string(),
                    severity: 0.0,
                    description: format!(
                        "Need at least {} actions for drift detection (have {})",
                        self.config.min_actions, self.profile.total_actions
                    ),
                    factor: "sample_size".to_string(),
                    evidence: vec![],
                }],
                recommendation: "Continue monitoring".to_string(),
                should_block: false,
            };
        }

        // Check action type shift
        if !self.baseline_action_types.is_empty() {
            let action_shift = self.calculate_distribution_shift(
                &self.baseline_action_types,
                &self.normalize_distribution(&self.profile.action_types),
            );

            if action_shift > self.config.action_shift_threshold {
                indicators.push(DriftIndicator {
                    indicator_type: "action_shift".to_string(),
                    severity: action_shift.min(1.0),
                    description: format!(
                        "Action type distribution shifted by {:.2}%",
                        action_shift * 100.0
                    ),
                    factor: "action_distribution".to_string(),
                    evidence: self.get_shifted_actions(),
                });
            }
        }

        // Check domain shift
        if !self.baseline_domains.is_empty() {
            let domain_shift = self.calculate_distribution_shift(
                &self.baseline_domains,
                &self.normalize_distribution(&self.profile.domains),
            );

            if domain_shift > self.config.domain_shift_threshold {
                indicators.push(DriftIndicator {
                    indicator_type: "domain-shift".to_string(),
                    severity: domain_shift.min(1.0),
                    description: format!(
                        "Domain distribution shifted by {:.2}%",
                        domain_shift * 100.0
                    ),
                    factor: "domain_distribution".to_string(),
                    evidence: self.get_shifted_domains(),
                });
            }
        }

        // Check rate anomaly
        if self.profile.actions_per_minute > 0.0 {
            let baseline_rate = 10.0; // Assume 10 actions/min baseline
            let rate_ratio = self.profile.actions_per_minute / baseline_rate;

            if rate_ratio > self.config.rate_anomaly_threshold {
                indicators.push(DriftIndicator {
                    indicator_type: "rate-anomaly".to_string(),
                    severity: (rate_ratio / self.config.rate_anomaly_threshold / 2.0).min(1.0),
                    description: format!(
                        "Action rate ({:.1}/min) is {:.1}x baseline",
                        self.profile.actions_per_minute, rate_ratio
                    ),
                    factor: "action_rate".to_string(),
                    evidence: vec![format!("Current rate: {:.1} actions/min", self.profile.actions_per_minute)],
                });
            }
        }

        // Check for forbidden pattern attempts
        if self.profile.forbidden_attempts > 0.0 {
            let forbidden_ratio = self.profile.forbidden_attempts / self.profile.total_actions;
            if forbidden_ratio > 0.1 {
                indicators.push(DriftIndicator {
                    indicator_type: "forbidden-pattern".to_string(),
                    severity: forbidden_ratio.min(1.0),
                    description: format!(
                        "{} forbidden attempts ({:.1}% of actions)",
                        self.profile.forbidden_attempts, forbidden_ratio * 100.0
                    ),
                    factor: "security_violations".to_string(),
                    evidence: vec![format!("{} forbidden attempts", self.profile.forbidden_attempts)],
                });
            }
        }

        // Calculate overall drift score
        let drift_score = if indicators.is_empty() {
            0.0
        } else {
            indicators.iter().map(|i| i.severity).sum::<f64>() / indicators.len() as f64
        };

        let drift_detected = drift_score > self.config.threshold;

        // Determine recommendation
        let recommendation = if drift_detected {
            if drift_score > 0.7 {
                "Block all actions and require user intervention".to_string()
            } else if drift_score > 0.5 {
                "Require approval for all actions until drift decreases".to_string()
            } else {
                "Increase monitoring and review recent actions".to_string()
            }
        } else {
            "Continue normal operation".to_string()
        };

        let should_block = drift_score > 0.7;

        DriftResult {
            drift_score,
            drift_detected,
            indicators,
            recommendation,
            should_block,
        }
    }

    /// Get the current profile
    pub fn profile(&self) -> &BehavioralProfile {
        &self.profile
    }

    /// Get recent actions
    pub fn recent_actions(&self) -> &VecDeque<SignedAction> {
        &self.recent_actions
    }

    // Private methods

    fn update_sequences(&mut self) {
        let actions: Vec<_> = self.recent_actions.iter().collect();
        if actions.len() < 2 {
            return;
        }

        // Create 2-gram sequence
        let seq_key = format!(
            "{} -> {}",
            actions[actions.len() - 2].action_type,
            actions[actions.len() - 1].action_type
        );

        let now = actions[actions.len() - 1].timestamp;

        self.sequences
            .entry(seq_key)
            .and_modify(|s| {
                s.count += 1.0;
                s.last_seen = now;
            })
            .or_insert(SequencePattern {
                sequence: vec![
                    actions[actions.len() - 2].action_type.clone(),
                    actions[actions.len() - 1].action_type.clone(),
                ],
                count: 1.0,
                last_seen: now,
            });

        // Limit sequences
        if self.sequences.len() > self.config.max_sequences {
            // Remove least common
            let mut entries: Vec<_> = self.sequences.iter().collect();
            entries.sort_by(|a, b| a.1.count.partial_cmp(&b.1.count).unwrap_or(std::cmp::Ordering::Equal));
            if let Some((key, _)) = entries.first() {
                let key = (*key).clone(); // Dereference to get &String, then clone to get String
                self.sequences.remove(&key);
            }
        }

        // Update profile
        let mut sequences: Vec<_> = self.sequences.values().cloned().collect();
        sequences.sort_by(|a, b| b.count.partial_cmp(&a.count).unwrap_or(std::cmp::Ordering::Equal));
        self.profile.common_sequences = sequences;
    }

    fn update_rate(&mut self, now: f64) {
        // Remove old times
        let cutoff = now - self.profile.rate_window;
        while let Some(&t) = self.last_action_times.front() {
            if t < cutoff {
                self.last_action_times.pop_front();
            } else {
                break;
            }
        }

        // Calculate rate
        if !self.last_action_times.is_empty() {
            let time_span = now - self.last_action_times.front().unwrap_or(&now);
            if time_span > 0.0 {
                self.profile.actions_per_minute =
                    (self.last_action_times.len() as f64 / time_span) * 60.0;
            }
        }
    }

    fn normalize_distribution(&self, dist: &HashMap<String, f64>) -> HashMap<String, f64> {
        let total: f64 = dist.values().sum();
        if total == 0.0 {
            return dist.clone();
        }

        dist.iter()
            .map(|(k, v)| (k.clone(), v / total))
            .collect()
    }

    fn calculate_distribution_shift(
        &self,
        baseline: &HashMap<String, f64>,
        current: &HashMap<String, f64>,
    ) -> f64 {
        // Total variation distance
        let all_keys: std::collections::HashSet<_> = baseline.keys()
            .chain(current.keys())
            .collect();

        let mut total_diff = 0.0;
        for key in all_keys {
            let base_val = baseline.get(key).unwrap_or(&0.0);
            let curr_val = current.get(key).unwrap_or(&0.0);
            total_diff += (base_val - curr_val).abs();
        }

        total_diff / 2.0
    }

    fn get_shifted_actions(&self) -> Vec<String> {
        let normalized = self.normalize_distribution(&self.profile.action_types);

        self.baseline_action_types.iter()
            .filter(|(k, base)| {
                let curr = normalized.get(*k).unwrap_or(&0.0);
                (*curr - **base).abs() > 0.1
            })
            .map(|(k, _)| k.clone())
            .collect()
    }

    fn get_shifted_domains(&self) -> Vec<String> {
        let normalized = self.normalize_distribution(&self.profile.domains);

        self.baseline_domains.iter()
            .filter(|(k, base)| {
                let curr = normalized.get(*k).unwrap_or(&0.0);
                (*curr - **base).abs() > 0.1
            })
            .map(|(k, _)| k.clone())
            .collect()
    }
}

// NAPI bindings

/// Create a drift detector
#[napi_derive::napi]
pub fn create_drift_detector(
    agent_id: String,
    intent_id: Option<String>,
) -> DriftDetectorHandle {
    DriftDetectorHandle {
        detector: DriftDetector::new(agent_id, intent_id),
    }
}

/// Handle for drift detector
#[napi]
pub struct DriftDetectorHandle {
    detector: DriftDetector,
}

#[napi]
impl DriftDetectorHandle {
    /// Record an action
    #[napi]
    pub fn record(&mut self, action: SignedAction) {
        self.detector.record_action(&action);
    }

    /// Record a forbidden attempt
    #[napi]
    pub fn record_forbidden(&mut self) {
        self.detector.record_forbidden_attempt();
    }

    /// Record an approval request
    #[napi]
    pub fn record_approval(&mut self) {
        self.detector.record_approval_request();
    }

    /// Detect drift
    #[napi]
    pub fn detect(&self) -> DriftResult {
        self.detector.detect_drift()
    }

    /// Get profile
    #[napi]
    pub fn profile(&self) -> BehavioralProfile {
        self.detector.profile().clone()
    }

    /// Set threshold
    #[napi]
    pub fn set_threshold(&mut self, threshold: f64) {
        self.detector.config.threshold = threshold;
    }

    /// Get recent actions
    #[napi]
    pub fn recent_actions(&self) -> Vec<SignedAction> {
        self.detector.recent_actions().iter().cloned().collect()
    }
}
