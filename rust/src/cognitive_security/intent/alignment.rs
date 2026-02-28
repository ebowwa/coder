//! Action-Intent Alignment Scoring
//!
//! Determines how well a proposed action aligns with the agent's
//! stated intent, goals, and boundaries.

use super::{AgentIntent, AlignmentResult, ActionContext, Boundary, Goal};

/// Score the alignment of an action against an intent
#[napi_derive::napi]
pub fn score_alignment(action: ActionContext, intent: AgentIntent) -> AlignmentResult {
    let action = &action;
    let intent = &intent;
    let mut reasoning_parts = Vec::new();
    let mut serves_goals = Vec::new();
    let mut hinders_goals = Vec::new();
    let mut boundary_concerns = Vec::new();
    let mut should_block = false;
    let mut requires_review = false;

    // 1. Check against boundaries (highest priority)
    for boundary in &intent.purpose.boundaries {
        if action_matches_boundary(action, boundary) {
            match boundary.enforcement.to_lowercase().as_str() {
                "never" => {
                    should_block = true;
                    boundary_concerns.push(format!(
                        "Violates hard boundary '{}': {}",
                        boundary.id, boundary.description
                    ));
                    reasoning_parts.push(format!(
                        "BLOCKED: Action violates '{}' boundary",
                        boundary.id
                    ));
                }
                "require_approval" => {
                    requires_review = true;
                    boundary_concerns.push(format!(
                        "May violate boundary '{}': {}",
                        boundary.id, boundary.description
                    ));
                }
                "log_only" | _ => {
                    boundary_concerns.push(format!(
                        "Near boundary '{}': {}",
                        boundary.id, boundary.description
                    ));
                }
                _ => {} // Unknown enforcement - treat as require_approval
            }
        }
    }

    // 2. Check against forbidden list (always blocks)
    for forbidden in &intent.principles.forbidden {
        if action_matches_pattern(action, forbidden) {
            should_block = true;
            reasoning_parts.push(format!("BLOCKED: Action matches forbidden pattern: {}", forbidden));
        }
    }

    // 3. Check against constraints
    for constraint in &intent.identity.constraints {
        if action_matches_pattern(action, constraint) {
            should_block = true;
            reasoning_parts.push(format!("BLOCKED: Action violates constraint: {}", constraint));
        }
    }

    // 4. Check against non-goals
    for non_goal in &intent.purpose.non_goals {
        if action_serves_description(action, non_goal) {
            hinders_goals.push(format!("non-goal: {}", non_goal));
            reasoning_parts.push(format!("Action may pursue non-goal: {}", non_goal));
        }
    }

    // 5. Score goal alignment
    let mut goal_alignment_scores = Vec::new();
    for goal in &intent.purpose.goals {
        let score = score_goal_alignment(action, goal);
        if score > 0.3 {
            serves_goals.push(goal.id.clone());
            if score > 0.7 {
                reasoning_parts.push(format!(
                    "Strongly serves goal '{}' ({})",
                    goal.id, goal.description
                ));
            }
        } else if score < -0.3 {
            hinders_goals.push(goal.id.clone());
            reasoning_parts.push(format!(
                "May hinder goal '{}' ({})",
                goal.id, goal.description
            ));
        }
        goal_alignment_scores.push(score);
    }

    // 6. Calculate overall score
    let base_score = if goal_alignment_scores.is_empty() {
        0.5 // Neutral if no goals defined
    } else {
        // Weighted average of goal alignment
        let weights: Vec<f64> = intent.purpose.goals.iter()
            .map(|g| {
                let prio = g.priority.to_lowercase();
                match prio.as_str() {
                    "critical" => 4.0,
                    "high" => 3.0,
                    "medium" => 2.0,
                    "low" => 1.0,
                    _ => 1.5, // Default for unknown
                }
            })
            .collect();

        let total_weight: f64 = weights.iter().sum();
        let weighted_sum: f64 = goal_alignment_scores.iter()
            .zip(weights.iter())
            .map(|(score, weight)| score * weight)
            .sum();

        (weighted_sum / total_weight + 1.0) / 2.0 // Normalize to 0-1
    };

    // Adjust score based on concerns
    let mut final_score = base_score;
    for _ in &boundary_concerns {
        final_score *= 0.8; // Each concern reduces score
    }
    if should_block {
        final_score = 0.0;
    }

    // Generate reasoning if empty
    if reasoning_parts.is_empty() {
        if serves_goals.is_empty() && hinders_goals.is_empty() {
            reasoning_parts.push("Action is neutral with respect to agent goals".to_string());
        } else if serves_goals.is_empty() {
            reasoning_parts.push("Action does not clearly serve any defined goals".to_string());
        } else {
            reasoning_parts.push(format!(
                "Action serves {} goal(s) without clear conflicts",
                serves_goals.len()
            ));
        }
    }

    //Calculate confidence based on specificity of intent
    let confidence = calculate_confidence(intent, action);

    AlignmentResult {
        score: final_score.clamp(0.0, 1.0),
        reasoning: reasoning_parts.join("; "),
        serves_goals,
        hinders_goals,
        boundary_concerns,
        confidence,
        should_block,
        requires_review,
    }
}

/// Check if action matches a boundary
fn action_matches_boundary(action: &ActionContext, boundary: &Boundary) -> bool {
    // Check domain match
    if !boundary.domain.is_empty() && action.domain != boundary.domain {
        return false;
    }

    //Check pattern if provided
    if let Some(pattern) = &boundary.pattern {
        return action_matches_pattern(action, pattern);
    }

    //If no pattern, just domain match is enough
    boundary.domain == action.domain
}

/// Check if action matches a text pattern
fn action_matches_pattern(action: &ActionContext, pattern: &str) -> bool {
    let pattern_lower = pattern.to_lowercase();

    //Check action type
    if action.action_type.to_lowercase().contains(&pattern_lower) {
        return true;
    }

    //Check operation
    if action.operation.to_lowercase().contains(&pattern_lower) {
        return true;
    }

    //Check domain
    if action.domain.to_lowercase().contains(&pattern_lower) {
        return true;
    }

    //Check target
    if let Some(target) = &action.target {
        if target.to_lowercase().contains(&pattern_lower) {
            return true;
        }
    }

    //Check reasoning
    if let Some(reasoning) = &action.reasoning {
        if reasoning.to_lowercase().contains(&pattern_lower) {
            return true;
        }
    }

    false
}

/// Check if action serves a description (simple keyword matching)
fn action_serves_description(action: &ActionContext, description: &str) -> bool {
    use std::collections::HashSet;

    //Simple keyword overlap for now
    let desc_lower = description.to_lowercase();
    let desc_words: HashSet<&str> = desc_lower
        .split_whitespace()
        .collect();

    let action_text = format!(
        "{} {} {} {}",
        action.action_type,
        action.domain,
        action.operation,
        action.reasoning.as_deref().unwrap_or("")
    ).to_lowercase();

    let action_words: HashSet<&str> = action_text
        .split_whitespace()
        .collect();

    //If more than 50% of description words appear in action, it's a match
    let overlap = desc_words.intersection(&action_words).count();
    overlap as f64 / desc_words.len() as f64 > 0.5
}

/// Score alignment with a specific goal
fn score_goal_alignment(action: &ActionContext, goal: &Goal) -> f64 {
    use std::collections::HashSet;

    let mut score = 0.0;

    //Keyword matching between action and goal
    let goal_desc_lower = goal.description.to_lowercase();
    let goal_words: HashSet<&str> = goal_desc_lower
        .split_whitespace()
        .filter(|w| w.len() > 3) //Skip short words
        .collect();

    let action_text = format!(
        "{} {} {} {}",
        action.action_type,
        action.domain,
        action.operation,
        action.reasoning.as_deref().unwrap_or("")
    ).to_lowercase();

    let action_words: HashSet<&str> = action_text
        .split_whitespace()
        .filter(|w| w.len() > 3)
        .collect();

    //Calculate overlap
    if !goal_words.is_empty() {
        let overlap = goal_words.intersection(&action_words).count();
        score = overlap as f64 / goal_words.len() as f64;
    }

    //Boost score if action reasoning explicitly references the goal
    if let Some(reasoning) = &action.reasoning {
        if reasoning.to_lowercase().contains(&goal.id.to_lowercase()) {
            score = (score + 0.5).min(1.0);
        }
    }

    //Check if action type aligns with goal type
    // (e.g., "collect" goal with "observe" action)
    score += type_goal_compatibility(&action.action_type, &goal.description);

    score.min(1.0)
}

/// Check compatibility between action type and goal description
fn type_goal_compatibility(action_type: &str, goal_desc: &str) -> f64 {
    let goal_lower = goal_desc.to_lowercase();
    let action_lower = action_type.to_lowercase();

    //Positive alignments
    let positive_pairs = [
        ("collect", "observe"),
        ("collect", "read"),
        ("analyze", "observe"),
        ("analyze", "process"),
        ("build", "create"),
        ("build", "modify"),
        ("improve", "modify"),
        ("fix", "modify"),
        ("learn", "observe"),
        ("learn", "read"),
        ("communicate", "inform"),
        ("communicate", "report"),
    ];

    for (goal_keyword, action_keyword) in positive_pairs.iter() {
        if goal_lower.contains(goal_keyword) && action_lower.contains(action_keyword) {
            return 0.3;
        }
    }

    //Negative alignments (contradictions)
    let negative_pairs = [
        ("preserve", "delete"),
        ("protect", "expose"),
        ("secure", "transfer"),
        ("maintain", "modify"),
    ];

    for (goal_keyword, action_keyword) in negative_pairs.iter() {
        if goal_lower.contains(goal_keyword) && action_lower.contains(action_keyword) {
            return -0.5;
        }
    }

    0.0
}

/// Calculate confidence in the alignment assessment
fn calculate_confidence(intent: &AgentIntent, _action: &ActionContext) -> f64 {
    let mut confidence: f64 = 0.5; // Base confidence

    // More goals = more signal
    if !intent.purpose.goals.is_empty() {
        confidence += 0.1;
        if intent.purpose.goals.len() >= 3 {
            confidence += 0.1;
        }
    }

    // Boundaries provide clear signals
    if !intent.purpose.boundaries.is_empty() {
        confidence += 0.1;
    }

    // Constraints provide clear signals
    if !intent.identity.constraints.is_empty() {
        confidence += 0.1;
    }

    // Forbidden list is very clear
    if !intent.principles.forbidden.is_empty() {
        confidence += 0.1;
    }

    // Non-goals help disambiguate
    if !intent.purpose.non_goals.is_empty() {
        confidence += 0.05;
    }

    confidence.min(0.95)
}

/// Batch score multiple actions
#[napi_derive::napi]
pub fn batch_score_alignment(
    actions: Vec<ActionContext>,
    intent: AgentIntent,
) -> Vec<AlignmentResult> {
    actions.into_iter()
        .map(|action| score_alignment(action, intent.clone()))
        .collect()
}

/// Check if any action in a sequence would violate intent
/// Returns indices of violating actions
#[napi_derive::napi]
pub fn check_sequence_violations(
    actions: Vec<ActionContext>,
    intent: AgentIntent,
) -> Vec<u32> {
    actions.iter()
        .enumerate()
        .filter_map(|(i, action)| {
            let result = score_alignment(action.clone(), intent.clone());
            if result.should_block {
                Some(i as u32)
            } else {
                None
            }
        })
        .collect()
}
