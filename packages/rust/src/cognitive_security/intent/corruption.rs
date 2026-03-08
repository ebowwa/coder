//! Intent Corruption Detection
//!
//! Detects when an agent's behavior or context suggests its intent
//! has been corrupted or manipulated.

use super::{AgentIntent, AlignmentResult, ActionContext};
use serde::{Deserialize, Serialize};

/// Snapshot of agent behavior for drift detection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct BehaviorSnapshot {
    /// When this snapshot was taken (Unix timestamp)
    pub timestamp: f64,

    /// Number of actions taken
    pub action_count: f64,

    /// Distribution of alignment scores
    pub alignment_distribution: AlignmentDistribution,

    /// Actions by domain
    pub actions_by_domain: Vec<DomainCount>,

    /// Actions by type
    pub actions_by_type: Vec<TypeCount>,

    /// Boundary violations detected
    pub boundary_violations: f64,

    /// Actions blocked
    pub actions_blocked: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct AlignmentDistribution {
    pub mean: f64,
    pub variance: f64,
    pub min: f64,
    pub max: f64,
    pub below_threshold_count: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DomainCount {
    pub domain: String,
    pub count: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct TypeCount {
    pub action_type: String,
    pub count: f64,
}

/// Result of corruption analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct CorruptionAnalysis {
    /// Overall corruption risk (0.0 = safe, 1.0 = likely corrupted)
    pub risk_score: f64,

    /// What kind of corruption might be happening
    pub indicators: Vec<CorruptionIndicator>,

    /// Recommended action (string: "continue", "monitor", "alert", "pause", "reset", "investigate")
    pub recommendation: String,

    /// Detailed explanation
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct CorruptionIndicator {
    pub indicator_type: String,
    pub severity: String,
    pub description: String,
    pub evidence: String,
}

/// Analyze behavior for signs of intent corruption
#[napi_derive::napi]
pub fn analyze_corruption(
    snapshot: BehaviorSnapshot,
    intent: AgentIntent,
) -> CorruptionAnalysis {
    let snapshot = &snapshot;
    let intent = &intent;
    let mut indicators = Vec::new();
    let mut risk_factors = Vec::new();

    // 1. Check alignment distribution
    if snapshot.alignment_distribution.mean < 0.3 {
        indicators.push(CorruptionIndicator {
            indicator_type: "low_alignment".to_string(),
            severity: "high".to_string(),
            description: "Average action alignment is very low".to_string(),
            evidence: format!(
                "Mean alignment: {:.2}, expected > 0.5",
                snapshot.alignment_distribution.mean
            ),
        });
        risk_factors.push(0.4);
    } else if snapshot.alignment_distribution.mean < 0.5 {
        indicators.push(CorruptionIndicator {
            indicator_type: "declining_alignment".to_string(),
            severity: "medium".to_string(),
            description: "Average action alignment is below optimal".to_string(),
            evidence: format!(
                "Mean alignment: {:.2}",
                snapshot.alignment_distribution.mean
            ),
        });
        risk_factors.push(0.2);
    }

    // 2. Check alignment variance (inconsistent behavior)
    if snapshot.alignment_distribution.variance > 0.2 {
        indicators.push(CorruptionIndicator {
            indicator_type: "inconsistent_behavior".to_string(),
            severity: "medium".to_string(),
            description: "High variance in alignment suggests unpredictable behavior".to_string(),
            evidence: format!(
                "Alignment variance: {:.3}, expected < 0.1",
                snapshot.alignment_distribution.variance
            ),
        });
        risk_factors.push(0.2);
    }

    // 3. Check boundary violations
    if snapshot.boundary_violations > 0.0 {
        let violation_rate = snapshot.boundary_violations / snapshot.action_count.max(1.0);
        if violation_rate > 0.1 {
            indicators.push(CorruptionIndicator {
                indicator_type: "frequent_boundary_violations".to_string(),
                severity: "critical".to_string(),
                description: "High rate of boundary violations".to_string(),
                evidence: format!(
                    "{}/{} actions violated boundaries ({:.1}%)",
                    snapshot.boundary_violations, snapshot.action_count, violation_rate * 100.0
                ),
            });
            risk_factors.push(0.5);
        } else {
            indicators.push(CorruptionIndicator {
                indicator_type: "boundary_violations".to_string(),
                severity: "medium".to_string(),
                description: "Some boundary violations detected".to_string(),
                evidence: format!(
                    "{}/{} actions violated boundaries",
                    snapshot.boundary_violations, snapshot.action_count
                ),
            });
            risk_factors.push(0.2);
        }
    }

    // 4. Check for actions in unexpected domains
    let expected_domains: std::collections::HashSet<&str> = intent.identity.capabilities
        .iter()
        .flat_map(|cap| {
            //Map capabilities to domains
            match cap.as_str() {
                "read_webpages" | "call_apis" => vec!["network", "api"],
                "store_data" => vec!["file", "database"],
                "process_text" => vec!["compute"],
                "execute_code" => vec!["code", "shell"],
                _ => vec![],
            }
        })
        .collect();

    for domain_count in &snapshot.actions_by_domain {
        if !expected_domains.contains(domain_count.domain.as_str())
            && !domain_count.domain.is_empty()
        {
            indicators.push(CorruptionIndicator {
                indicator_type: "unexpected_domain".to_string(),
                severity: "medium".to_string(),
                description: format!("Actions in unexpected domain: {}", domain_count.domain),
                evidence: format!("{} actions in domain", domain_count.count),
            });
            risk_factors.push(0.15);
        }
    }

    // 5. Checkfor forbidden action attempts
    for type_count in &snapshot.actions_by_type {
        for forbidden in &intent.principles.forbidden {
            if type_count.action_type.to_lowercase().contains(&forbidden.to_lowercase()) {
                indicators.push(CorruptionIndicator {
                    indicator_type: "forbidden_action_attempt".to_string(),
                    severity: "critical".to_string(),
                    description: format!("Attempted forbidden action: {}", forbidden),
                    evidence: format!("{} attempts", type_count.count),
                });
                risk_factors.push(0.6);
            }
        }
    }

    // 6. Check block rate (high block rate suggests manipulation attempts)
    let block_rate = snapshot.actions_blocked / snapshot.action_count.max(1.0);
    if block_rate > 0.2 {
        indicators.push(CorruptionIndicator {
            indicator_type: "high_block_rate".to_string(),
            severity: "high".to_string(),
            description: "Many actions being blocked by policy".to_string(),
            evidence: format!(
                "{}/{} actions blocked ({:.1}%)",
                snapshot.actions_blocked, snapshot.action_count, block_rate * 100.0
            ),
        });
        risk_factors.push(0.3);
    }

    // Calculate overall risk
    let risk_score = if risk_factors.is_empty() {
        0.0
    } else {
        // Combine risk factors, capped at 1.0
        risk_factors.iter().sum::<f64>().min(1.0)
    };

    // Determine recommendation
    let recommendation = if risk_score >= 0.8 {
        "reset"
    } else if risk_score >= 0.6 {
        "pause"
    } else if risk_score >= 0.4 {
        "investigate"
    } else if risk_score >= 0.2 {
        "alert"
    } else if risk_score >= 0.1 {
        "monitor"
    } else {
        "continue"
    };

    // Generate explanation
    let explanation = if indicators.is_empty() {
        "No signs of corruption detected. Agent behavior aligns with intent.".to_string()
    } else {
        format!(
            "Detected {} potentialindicator(s) of intent corruption: {}",
            indicators.len(),
            indicators.iter()
                .map(|i| format!("{} ({})", i.indicator_type, i.severity))
                .collect::<Vec<_>>()
                .join(", ")
        )
    };

    CorruptionAnalysis {
        risk_score,
        indicators,
        recommendation: recommendation.to_string(),
        explanation,
    }
}

/// Compare two behavior snapshots to detect behavioral drift
#[napi_derive::napi]
pub fn detect_behavioral_drift(
    baseline: BehaviorSnapshot,
    current: BehaviorSnapshot,
) -> DriftResult {
    let mut drift_factors = Vec::new();

    // 1. Alignment drift
    let alignment_drift = (current.alignment_distribution.mean - baseline.alignment_distribution.mean).abs();
    drift_factors.push(DriftFactor {
        factor_type: "alignment".to_string(),
        drift: alignment_drift,
        description: format!(
            "Alignment changed from {:.2} to {:.2}",
            baseline.alignment_distribution.mean, current.alignment_distribution.mean
        ),
    });

    // 2. Domain distribution drift
    let mut domain_drift = 0.0;
    let baseline_domains: std::collections::HashMap<&str, f64> = baseline.actions_by_domain
        .iter()
        .map(|d| (d.domain.as_str(), d.count / baseline.action_count.max(1.0)))
        .collect();
    let current_domains: std::collections::HashMap<&str, f64> = current.actions_by_domain
        .iter()
        .map(|d| (d.domain.as_str(), d.count / current.action_count.max(1.0)))
        .collect();

    for (domain, baseline_pct) in &baseline_domains {
        let current_pct = current_domains.get(domain).unwrap_or(&0.0);
        domain_drift += (current_pct - baseline_pct).abs();
    }
    for (domain, current_pct) in &current_domains {
        if !baseline_domains.contains_key(domain) {
            domain_drift += current_pct;
        }
    }
    domain_drift /= 2.0; // Average

    drift_factors.push(DriftFactor {
        factor_type: "domain_distribution".to_string(),
        drift: domain_drift,
        description: format!("Domain distribution changed by {:.1}%", domain_drift * 100.0),
    });

    // 3. Violation rate drift
    let baseline_violation_rate = baseline.boundary_violations / baseline.action_count.max(1.0);
    let current_violation_rate = current.boundary_violations / current.action_count.max(1.0);
    let violation_drift = (current_violation_rate - baseline_violation_rate).abs();

    drift_factors.push(DriftFactor {
        factor_type: "violation_rate".to_string(),
        drift: violation_drift,
        description: format!(
            "Boundary violation rate changed from {:.1}% to {:.1}%",
            baseline_violation_rate * 100.0, current_violation_rate * 100.0
        ),
    });

    // Calculate overall drift
    let overall_drift = drift_factors.iter()
        .map(|f| f.drift)
        .sum::<f64>()
        / drift_factors.len() as f64;

    let concern_level = if overall_drift > 0.5 {
        "critical"
    } else if overall_drift > 0.3 {
        "high"
    } else if overall_drift > 0.15 {
        "medium"
    } else if overall_drift > 0.05{
        "low"
    } else {
        "none"
    };

    DriftResult {
        overall_drift,
        drift_factors,
        concern_level: concern_level.to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DriftResult {
    pub overall_drift: f64,
    pub drift_factors: Vec<DriftFactor>,
    pub concern_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DriftFactor {
    pub factor_type: String,
    pub drift: f64,
    pub description: String,
}

/// Create an empty behavior snapshot
#[napi_derive::napi]
pub fn create_empty_snapshot() -> BehaviorSnapshot {
    BehaviorSnapshot {
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as f64,
        action_count: 0.0,
        alignment_distribution: AlignmentDistribution {
            mean: 0.0,
            variance: 0.0,
            min: 0.0,
            max: 0.0,
            below_threshold_count: 0.0,
        },
        actions_by_domain: Vec::new(),
        actions_by_type: Vec::new(),
        boundary_violations: 0.0,
        actions_blocked: 0.0,
    }
}

/// Update a snapshot with a new action result
#[napi_derive::napi]
pub fn update_snapshot(
    mut snapshot: BehaviorSnapshot,
    action: ActionContext,
    alignment: AlignmentResult,
) -> BehaviorSnapshot{
    snapshot.action_count += 1.0;
    snapshot.timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as f64;

    // Update alignment distribution (running calculation)
    let n = snapshot.action_count;
    let old_mean = snapshot.alignment_distribution.mean;
    let new_score = alignment.score;

    // Welford's online algorithm for mean and variance
    snapshot.alignment_distribution.mean = old_mean + (new_score - old_mean) / n;
    if n > 1.0{
        snapshot.alignment_distribution.variance =
            snapshot.alignment_distribution.variance +
            (new_score - old_mean) * (new_score - snapshot.alignment_distribution.mean) / n;
    }

    // Update min/max
    snapshot.alignment_distribution.min = snapshot.alignment_distribution.min.min(new_score);
    snapshot.alignment_distribution.max = snapshot.alignment_distribution.max.max(new_score);

    // Track below threshold
    if new_score < 0.5 {
        snapshot.alignment_distribution.below_threshold_count += 1.0;
    }

    // Update domain counts
    if let Some(domain_count) = snapshot.actions_by_domain.iter_mut()
        .find(|d| d.domain == action.domain)
    {
        domain_count.count += 1.0;
    } else {
        snapshot.actions_by_domain.push(DomainCount {
            domain: action.domain.clone(),
            count: 1.0,
        });
    }

    // Update type counts
    if let Some(type_count) = snapshot.actions_by_type.iter_mut()
        .find(|t| t.action_type == action.action_type)
    {
        type_count.count += 1.0;
    } else {
        snapshot.actions_by_type.push(TypeCount {
            action_type: action.action_type.clone(),
            count: 1.0,
        });
    }

    // Track violations and blocks
    if !alignment.boundary_concerns.is_empty() {
        snapshot.boundary_violations += 1.0;
    }
    if alignment.should_block {
        snapshot.actions_blocked += 1.0;
    }

    snapshot
}
