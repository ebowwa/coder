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

// Cognitive Security Module (temporarily disabled - needs fixes)
// pub mod cognitive_security;

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

// ===== Cognitive Security: Intent Module =====
// Temporarily disabled - module needs fixes

