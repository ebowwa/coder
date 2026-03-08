#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;

pub mod hash;
pub mod grep;
pub mod highlight;
pub mod diff;
pub mod multi_edit;
pub mod patterns;
pub mod structure;
pub mod tool_pairs;
pub mod tool_use;
pub mod input;
pub mod tui;

// Cognitive Security Module
pub mod cognitive_security;

// ===== Shared Types =====

#[napi(object)]
pub struct GrepMatch {
    pub path: String,
    pub line: u32,
    pub column: u32,
    pub content: String,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[napi(object)]
pub struct GrepOptions {
    pub case_sensitive: Option<bool>,
    pub case_insensitive: Option<bool>,
    pub context_lines: Option<u32>,
    pub max_results: Option<u32>,
    pub include_patterns: Vec<String>,
    pub exclude_patterns: Vec<String>,
}

#[napi(object)]
pub struct GrepResult {
    pub matches: Vec<GrepMatch>,
    pub total_count: u32,
}

#[napi(object)]
pub struct HashResult {
    pub hash: String,
    pub algorithm: String,
}

#[napi(object)]
pub struct HighlightResult {
    pub html: String,
    pub theme: String,
}

#[napi(object)]
pub struct HighlightDiffResult {
    /// ANSI-colored diff output
    pub output: String,
    /// Number of added lines
    pub additions: u32,
    /// Number of deleted lines
    pub deletions: u32,
    /// Number of hunks
    pub hunks: u32,
}

#[napi(object)]
pub struct DiffOptions {
    /// File path to display in header
    pub file_path: Option<String>,
    /// Number of context lines around changes
    pub context_lines: Option<u32>,
}

#[napi(object)]
pub struct StructureItem {
    pub kind: String,
    pub name: String,
    pub line: u32,
    pub column: u32,
    pub end_line: Option<u32>,
    pub end_column: Option<u32>,
    pub children: Vec<StructureItem>,
}

#[napi(object)]
pub struct StructureOptions {
    pub include_comments: Option<bool>,
    pub max_depth: Option<u32>,
}

#[napi(object)]
pub struct StructureResult {
    pub items: Vec<StructureItem>,
    pub language: String,
}

#[napi(object)]
pub struct ToolPair {
    pub tool1: String,
    pub tool2: String,
    pub target1: String,
    pub target2: String,
    pub similarity: f64,
}

#[napi(object)]
pub struct ToolPairsResult {
    pub pairs: Vec<ToolPair>,
    pub total_calls: u32,
}

#[napi(object)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub content: String,
}

// ===== Pattern Recognition =====

#[napi(object)]
pub struct PatternResult {
    pub tools: Vec<String>,
    pub support: u32,
    pub confidence: f64,
}

#[napi]
pub fn analyze_patterns(messages: Vec<String>, min_support: Option<u32>) -> Vec<PatternResult> {
    let min_support = min_support.unwrap_or(2) as usize;

    let parsed: Vec<serde_json::Value> = messages
        .iter()
        .filter_map(|s| serde_json::from_str(s).ok())
        .collect();

    let tool_uses = patterns::parse_tool_uses(&parsed);
    let patterns = patterns::find_sequential_patterns(&tool_uses, min_support);

    patterns
        .into_iter()
        .map(|p| PatternResult {
            tools: p.tools,
            support: p.support as u32,
            confidence: p.confidence,
        })
        .collect()
}

#[napi(object)]
pub struct ToolCountEntry {
    pub tool_name: String,
    pub count: u32,
}

#[napi]
pub fn count_tool_uses_native(messages: Vec<String>) -> Vec<ToolCountEntry> {
    let parsed: Vec<serde_json::Value> = messages
        .iter()
        .filter_map(|s| serde_json::from_str(s).ok())
        .collect();

    let counts = tool_use::count_tool_uses(&parsed);

    counts
        .into_iter()
        .map(|(name, count)| ToolCountEntry {
            tool_name: name,
            count: count as u32,
        })
        .collect()
}

#[napi(object)]
pub struct ContextStatsResult {
    pub total_tokens: u32,
    pub user_tokens: u32,
    pub assistant_tokens: u32,
    pub tool_result_tokens: u32,
    pub message_count: u32,
}

// Internal helper for context stats calculation
fn calculate_context_stats_internal(messages: &[serde_json::Value]) -> InternalContextStats {
    let mut total_tokens = 0;
    let mut tool_result_tokens = 0;
    let mut user_tokens = 0;
    let mut assistant_tokens = 0;

    for msg in messages {
        let msg_str = serde_json::to_string(msg).unwrap_or_default();
        let msg_tokens = msg_str.len() / 4;

        total_tokens += msg_tokens;

        if let Some(role) = msg.get("role").and_then(|r| r.as_str()) {
            match role {
                "user" => user_tokens += msg_tokens,
                "assistant" => assistant_tokens += msg_tokens,
                _ => {}
            }
        }

        // Count tool result content separately
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                        if let Some(result) = block.get("result") {
                            let result_str = result.to_string();
                            tool_result_tokens += result_str.len() / 4;
                        }
                    }
                }
            }
        }
    }

    InternalContextStats {
        total_tokens,
        user_tokens,
        assistant_tokens,
        tool_result_tokens,
        message_count: messages.len(),
    }
}

struct InternalContextStats {
    total_tokens: usize,
    user_tokens: usize,
    assistant_tokens: usize,
    tool_result_tokens: usize,
    message_count: usize,
}

#[napi]
pub fn calculate_context_stats(messages: Vec<String>) -> ContextStatsResult {
    let parsed: Vec<serde_json::Value> = messages
        .iter()
        .filter_map(|s| serde_json::from_str(s).ok())
        .collect();

    let stats = calculate_context_stats_internal(&parsed);

    ContextStatsResult {
        total_tokens: stats.total_tokens as u32,
        user_tokens: stats.user_tokens as u32,
        assistant_tokens: stats.assistant_tokens as u32,
        tool_result_tokens: stats.tool_result_tokens as u32,
        message_count: stats.message_count as u32,
    }
}

// ===== Exports =====

#[napi]
pub async fn grep_search(
    pattern: String,
    path: String,
    options: Option<GrepOptions>,
) -> Result<GrepResult> {
    let internal_opts = grep::GrepOptions {
        case_insensitive: options.as_ref()
            .and_then(|o| o.case_insensitive)
            .unwrap_or_else(|| options.as_ref()
                .and_then(|o| o.case_sensitive)
                .map(|v| !v)
                .unwrap_or(false)),
        max_results: options.as_ref().and_then(|o| o.max_results),
        include_patterns: options.as_ref()
            .map(|o| o.include_patterns.clone())
            .unwrap_or_default(),
        exclude_patterns: options.as_ref()
            .map(|o| o.exclude_patterns.clone())
            .unwrap_or_default(),
    };

    let results = grep::grep_search(&pattern, std::path::Path::new(&path), internal_opts).await
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let matches: Vec<GrepMatch> = results.into_iter().map(|r| GrepMatch {
        path: r.path.to_string_lossy().to_string(),
        line: r.line_number as u32,
        column: 0,
        content: r.line,
        context_before: vec![],
        context_after: vec![],
    }).collect();

    Ok(GrepResult {
        total_count: matches.len() as u32,
        matches,
    })
}

#[napi]
pub fn calculate_hash(content: String, algorithm: Option<String>) -> Result<HashResult> {
    hash::calculate_hash(&content, algorithm.as_deref())
        .map_err(|e| Error::from_reason(e.to_string()))
}

#[napi]
pub fn count_tokens(text: String) -> u32 {
    // Rough approximation: ~4 chars per token
    (text.len() / 4) as u32
}

#[napi]
pub fn highlight_code(code: String, language: String) -> Result<HighlightResult> {
    highlight::highlight_code(&code, &language)
        .map_err(|e| Error::from_reason(e.to_string()))
}

#[napi]
pub fn highlight_markdown(markdown: String) -> Result<HighlightResult> {
    highlight::highlight_markdown(&markdown)
        .map_err(|e| Error::from_reason(e.to_string()))
}

#[napi]
pub fn analyze_structure(
    file_path: String,
    content: String,
) -> Result<StructureResult> {
    structure::parse_structure(&content, &file_path, None)
        .map_err(|e| Error::from_reason(e.to_string()))
}

#[napi]
pub fn find_tool_pairs(logs: Vec<String>, threshold: Option<f64>) -> ToolPairsResult {
    // Parse logs into (tool, target) pairs
    let pairs: Vec<(String, String)> = logs
        .iter()
        .filter_map(|log| {
            // Simple parsing: "ToolName target_path"
            let parts: Vec<&str> = log.splitn(2, ' ').collect();
            if parts.len() == 2 {
                Some((parts[0].to_string(), parts[1].to_string()))
            } else {
                None
            }
        })
        .collect();

    tool_pairs::find_tool_pairs(&pairs, threshold.unwrap_or(0.5))
}

#[napi]
pub fn highlight_diff(
    old_text: String,
    new_text: String,
    options: Option<DiffOptions>,
) -> HighlightDiffResult {
    let file_path = options.as_ref().and_then(|o| o.file_path.as_deref());
    let context_lines = options.as_ref().and_then(|o| o.context_lines).unwrap_or(3) as usize;

    let result = diff::highlight_diff(&old_text, &new_text, file_path, context_lines);

    HighlightDiffResult {
        output: result.output,
        additions: result.additions,
        deletions: result.deletions,
        hunks: result.hunks,
    }
}

#[napi]
pub fn calculate_diff(old_text: String, new_text: String) -> Result<Vec<DiffHunk>> {
    diff::calculate_diff(&old_text, &new_text)
        .map_err(|e| Error::from_reason(e.to_string()))
}

// ===== Multi-File Edit =====

/// A single edit operation for multi-file editing
#[napi(object)]
pub struct MultiEditEntry {
    /// File path to edit
    pub file_path: String,
    /// String to find and replace
    pub old_string: String,
    /// Replacement string
    pub new_string: String,
    /// Replace all occurrences (default: false)
    pub replace_all: Option<bool>,
}

/// Result of an atomic multi-file edit operation
#[napi(object)]
pub struct MultiEditResult {
    /// Whether all edits succeeded
    pub success: bool,
    /// List of files that were modified
    pub files_modified: Vec<String>,
    /// Total number of string replacements made
    pub total_replacements: u32,
    /// Error message if operation failed
    pub error: Option<String>,
    /// Whether changes were rolled back due to failure
    pub rolled_back: bool,
}

/// Preview result for a single file
#[napi(object)]
pub struct MultiEditPreviewEntry {
    /// File path
    pub file_path: String,
    /// Number of replacements that would be made
    pub replacement_count: u32,
}

/// Validate edits without applying them
#[napi]
pub fn validate_multi_edits(edits: Vec<MultiEditEntry>) -> Result<Vec<String>> {
    let file_edits: Vec<multi_edit::FileEdit> = edits
        .into_iter()
        .map(|e| multi_edit::FileEdit {
            file_path: std::path::PathBuf::from(&e.file_path),
            old_string: e.old_string,
            new_string: e.new_string,
            replace_all: e.replace_all.unwrap_or(false),
        })
        .collect();

    let result = multi_edit::validate_edits(&file_edits);

    if result.valid {
        Ok(vec![])
    } else {
        Ok(result.errors)
    }
}

/// Preview what edits would be applied without making changes
#[napi]
pub fn preview_multi_edits(edits: Vec<MultiEditEntry>) -> Result<Vec<MultiEditPreviewEntry>> {
    let file_edits: Vec<multi_edit::FileEdit> = edits
        .into_iter()
        .map(|e| multi_edit::FileEdit {
            file_path: std::path::PathBuf::from(&e.file_path),
            old_string: e.old_string,
            new_string: e.new_string,
            replace_all: e.replace_all.unwrap_or(false),
        })
        .collect();

    let preview = multi_edit::preview_edits(&file_edits)
        .map_err(|e| Error::from_reason(e.to_string()))?;

    Ok(preview
        .into_iter()
        .map(|(path, count)| MultiEditPreviewEntry {
            file_path: path.to_string_lossy().to_string(),
            replacement_count: count,
        })
        .collect())
}

/// Apply multiple file edits atomically with rollback on failure
///
/// This function:
/// 1. Validates all edits can be applied (files exist, strings found)
/// 2. Creates backups of all affected files
/// 3. Applies all edits
/// 4. Rolls back on any failure
///
/// Returns a MultiEditResult with success status and list of modified files.
#[napi]
pub fn apply_multi_edits(edits: Vec<MultiEditEntry>) -> MultiEditResult {
    let file_edits: Vec<multi_edit::FileEdit> = edits
        .into_iter()
        .map(|e| multi_edit::FileEdit {
            file_path: std::path::PathBuf::from(&e.file_path),
            old_string: e.old_string,
            new_string: e.new_string,
            replace_all: e.replace_all.unwrap_or(false),
        })
        .collect();

    let result = multi_edit::apply_edits_atomically(&file_edits);

    MultiEditResult {
        success: result.success,
        files_modified: result.files_modified,
        total_replacements: result.total_replacements,
        error: result.error,
        rolled_back: result.rolled_back,
    }
}

// ===== Cognitive Security: NAPI Wrapper Functions =====
// We need to wrap the cognitive security functions with #[napi] attributes
// because pub use re-exports don't carry the NAPI derive macros.

// Re-export types (these work with pub use because they're just types)
pub use cognitive_security::intent::{
    AgentIntent, AgentIdentity, AgentPurpose, AgentPrinciples, Goal, Boundary,
    AlignmentResult, ActionContext, IntegrityResult, IntentKeypair,
    ValidationResult, BehaviorSnapshot, AlignmentDistribution, DomainCount,
    TypeCount, CorruptionAnalysis, CorruptionIndicator, DriftResult, DriftFactor,
};
pub use cognitive_security::action::{
    ActionType, FlowDirection, DomainId, ClassifiedAction,
    ActionValidationResult, ActionPolicy, ActionContextForValidation,
    ActionClassifierHandle, ActionRiskInfo, ActionValidatorHandle,
};
pub use cognitive_security::flow::{
    SensitivityLevel, DataCategory, ClassifiedData, FlowRecord,
    FlowValidationRequest, FlowValidationResult, DomainBoundary,
    DataClassifierHandle, SensitivityLevelInfo, DataCategoryInfo,
};

// ===== Action Module NAPI Wrappers =====

/// Classify an operation into action type and risk level
#[napi]
pub fn classify_operation(
    operation: String,
    domain: String,
    target: Option<String>,
    reasoning: Option<String>,
) -> ClassifiedAction {
    cognitive_security::action::classify_operation(operation, domain, target, reasoning)
}

/// Get all available action types
#[napi]
pub fn get_action_types() -> Vec<String> {
    cognitive_security::action::get_action_types()
}

/// Get action risk levels
#[napi]
pub fn get_action_risk_levels() -> Vec<ActionRiskInfo> {
    cognitive_security::action::get_action_risk_levels()
}

/// Create a new action classifier
#[napi]
pub fn create_action_classifier() -> ActionClassifierHandle {
    cognitive_security::action::create_action_classifier()
}

/// Create a new action validator
#[napi]
pub fn create_action_validator() -> ActionValidatorHandle {
    cognitive_security::action::create_action_validator()
}

/// Create a deny-all policy
#[napi]
pub fn create_deny_all_policy() -> ActionPolicy {
    cognitive_security::action::create_deny_all_policy()
}

/// Create an observe-only policy
#[napi]
pub fn create_observe_only_policy() -> ActionPolicy {
    cognitive_security::action::create_observe_only_policy()
}

/// Create a transfer approval policy
#[napi]
pub fn create_transfer_approval_policy() -> ActionPolicy {
    cognitive_security::action::create_transfer_approval_policy()
}

/// Validate an action against an intent
#[napi]
pub fn validate_action_against_intent(
    context: ActionContextForValidation,
    intent: AgentIntent,
) -> ActionValidationResult {
    cognitive_security::action::validate_action_against_intent(context, intent)
}

// ===== Intent Module NAPI Wrappers =====

/// Generate a new intent keypair for signing
#[napi]
pub fn generate_intent_keypair() -> IntentKeypair {
    cognitive_security::intent::generate_intent_keypair()
}

/// Sign an intent with a private key (returns the signed intent)
#[napi]
pub fn sign_intent(intent: AgentIntent, private_key: String) -> Result<AgentIntent> {
    cognitive_security::intent::sign_intent(intent, private_key)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Verify an intent signature
#[napi]
pub fn verify_intent_signature(intent: AgentIntent) -> IntegrityResult {
    cognitive_security::intent::verify_intent_signature(intent)
}

/// Hash an intent
#[napi]
pub fn hash_intent(intent: AgentIntent) -> String {
    cognitive_security::intent::hash_intent(intent)
}

/// Check if two intents are equivalent
#[napi]
pub fn intents_equivalent(intent1: AgentIntent, intent2: AgentIntent) -> bool {
    cognitive_security::intent::intents_equivalent(intent1, intent2)
}

/// Score alignment between action context and intent
#[napi]
pub fn score_alignment(action: ActionContext, intent: AgentIntent) -> AlignmentResult {
    cognitive_security::intent::score_alignment(action, intent)
}

/// Batch score alignment
#[napi]
pub fn batch_score_alignment(actions: Vec<ActionContext>, intent: AgentIntent) -> Vec<AlignmentResult> {
    cognitive_security::intent::batch_score_alignment(actions, intent)
}

/// Check sequence violations (returns indices of violating actions)
#[napi]
pub fn check_sequence_violations(actions: Vec<ActionContext>, intent: AgentIntent) -> Vec<u32> {
    cognitive_security::intent::check_sequence_violations(actions, intent)
}

/// Create an intent builder
#[napi]
pub fn create_intent_builder() -> cognitive_security::intent::IntentBuilder {
    cognitive_security::intent::create_intent_builder()
}

/// Load intent from file
#[napi]
pub fn load_intent_from_file(path: String) -> Result<AgentIntent> {
    cognitive_security::intent::load_intent_from_file(path)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Save intent to file
#[napi]
pub fn save_intent_to_file(intent: AgentIntent, path: String) -> Result<()> {
    cognitive_security::intent::save_intent_to_file(intent, path)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Parse intent from JSON string
#[napi]
pub fn parse_intent(json: String) -> Result<AgentIntent> {
    cognitive_security::intent::parse_intent(json)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Serialize intent to JSON string
#[napi]
pub fn serialize_intent(intent: AgentIntent) -> Result<String> {
    cognitive_security::intent::serialize_intent(intent)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Validate intent structure
#[napi]
pub fn validate_intent_structure(intent: AgentIntent) -> ValidationResult {
    cognitive_security::intent::validate_intent_structure(intent)
}

/// Create a data collector intent
#[napi]
pub fn create_data_collector_intent(name: String, description: String) -> AgentIntent {
    cognitive_security::intent::create_data_collector_intent(name, description)
}

/// Merge two intents
#[napi]
pub fn merge_intents(base: AgentIntent, override_intent: AgentIntent) -> AgentIntent {
    cognitive_security::intent::merge_intents(base, override_intent)
}

/// Analyze corruption in behavior
#[napi]
pub fn analyze_corruption(snapshot: BehaviorSnapshot, intent: AgentIntent) -> CorruptionAnalysis {
    cognitive_security::intent::analyze_corruption(snapshot, intent)
}

/// Detect behavioral drift
#[napi]
pub fn detect_behavioral_drift(baseline: BehaviorSnapshot, current: BehaviorSnapshot) -> DriftResult {
    cognitive_security::intent::detect_behavioral_drift(baseline, current)
}

/// Create an empty behavior snapshot
#[napi]
pub fn create_empty_snapshot() -> BehaviorSnapshot {
    cognitive_security::intent::create_empty_snapshot()
}

/// Update a behavior snapshot with new action and alignment
#[napi]
pub fn update_snapshot(
    snapshot: BehaviorSnapshot,
    action: ActionContext,
    alignment: AlignmentResult,
) -> BehaviorSnapshot {
    cognitive_security::intent::update_snapshot(snapshot, action, alignment)
}

// ===== Flow Module NAPI Wrappers =====

/// Classify data sensitivity
#[napi]
pub fn classify_data(data: String, source_domain: String, tags: Vec<String>) -> ClassifiedData {
    cognitive_security::flow::classify_data(data, source_domain, tags)
}

/// Check if data contains sensitive information
#[napi]
pub fn contains_sensitive_data(data: String) -> bool {
    cognitive_security::flow::contains_sensitive_data(data)
}

/// Redact sensitive data
#[napi]
pub fn redact_sensitive(data: String, replacement: Option<String>) -> String {
    cognitive_security::flow::redact_sensitive(data, replacement)
}

/// Get all sensitivity levels
#[napi]
pub fn get_sensitivity_levels() -> Vec<SensitivityLevelInfo> {
    cognitive_security::flow::get_sensitivity_levels()
}

/// Get all data categories
#[napi]
pub fn get_data_categories() -> Vec<DataCategoryInfo> {
    cognitive_security::flow::get_data_categories()
}

/// Create a data classifier
#[napi]
pub fn create_data_classifier() -> DataClassifierHandle {
    cognitive_security::flow::create_data_classifier()
}

/// Create a flow policy engine
#[napi]
pub fn create_flow_policy_engine() -> cognitive_security::flow::FlowPolicyEngineHandle {
    cognitive_security::flow::create_flow_policy_engine()
}

/// Create an allow-all flow policy
#[napi]
pub fn create_allow_all_flow_policy() -> cognitive_security::flow::FlowPolicy {
    cognitive_security::flow::create_allow_all_flow_policy()
}

/// Create a deny-all flow policy
#[napi]
pub fn create_deny_all_flow_policy() -> cognitive_security::flow::FlowPolicy {
    cognitive_security::flow::create_deny_all_flow_policy()
}

/// Create a strict flow policy
#[napi]
pub fn create_strict_flow_policy() -> cognitive_security::flow::FlowPolicy {
    cognitive_security::flow::create_strict_flow_policy()
}

/// Create a flow tracker
#[napi]
pub fn create_flow_tracker() -> cognitive_security::flow::FlowTrackerHandle {
    cognitive_security::flow::create_flow_tracker()
}

/// Create a leak prevention engine
#[napi]
pub fn create_leak_prevention() -> cognitive_security::flow::LeakPreventionHandle {
    cognitive_security::flow::create_leak_prevention()
}

/// Check content for leaks
#[napi]
pub fn check_for_leaks(content: String, channel: String) -> cognitive_security::flow::LeakCheckResult {
    cognitive_security::flow::check_for_leaks(content, channel)
}

/// Sanitize content
#[napi]
pub fn sanitize_content(content: String) -> String {
    cognitive_security::flow::sanitize_content(content)
}

/// Create a taint tracker
#[napi]
pub fn create_taint_tracker() -> cognitive_security::flow::TaintTrackerHandle {
    cognitive_security::flow::create_taint_tracker()
}

// ===== Terminal Input Module =====

/// Re-export NativeKeyEvent type
pub use input::NativeKeyEvent;

/// Create a terminal handle for raw mode input
/// This is the main entry point for terminal input handling
#[napi]
pub fn create_terminal() -> input::TerminalHandle {
    input::create_terminal()
}

// ===== Native TUI Module =====

/// Re-export TUI types
pub use tui::{TuiMessage, TuiState, InputResult, NativeTuiHandle};

/// Create a native TUI handle
/// This replaces the Ink-based React TUI with a pure Rust implementation
#[napi]
pub fn create_tui() -> Result<NativeTuiHandle> {
    NativeTuiHandle::new()
}
