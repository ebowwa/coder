//! Claude Code Native Module
//!
//! Performance-critical components implemented in Rust:
//! - Fast file search (ripgrep-based)
//! - Token counting
//! - Diff calculation
//! - Content compaction

use napi::bindgen_prelude::*;
use napi_derive::napi;

mod search;
mod tokens;
mod diff;
mod compact;

/// Fast file search using ripgrep
#[napi]
pub async fn search_files(
    pattern: String,
    path: String,
    options: Option<SearchOptions>,
) -> Result<SearchResult> {
    search::search_files(&pattern, &path, options.unwrap_or_default())
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Count tokens in text (approximate)
#[napi]
pub fn count_tokens(text: String) -> Result<u32> {
    Ok(tokens::count_tokens(&text))
}

/// Calculate diff between two strings
#[napi]
pub fn calculate_diff(old_text: String, new_text: String) -> Result<Vec<DiffHunk>> {
    diff::calculate_diff(&old_text, &new_text)
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// Compact content to fit within token limit
#[napi]
pub fn compact_content(
    content: String,
    max_tokens: u32,
    strategy: Option<String>,
) -> Result<String> {
    compact::compact_content(&content, max_tokens, strategy.as_deref())
        .map_err(|e| Error::from_reason(e.to_string()))
}

// ============================================
// TYPES
// ============================================

#[napi(object)]
pub struct SearchOptions {
    /// Case insensitive search
    pub case_insensitive: Option<bool>,
    /// Glob pattern to filter files
    pub glob: Option<String>,
    /// Maximum results
    pub max_results: Option<u32>,
    /// Include context lines
    pub context_lines: Option<u32>,
    /// Search hidden files
    pub hidden: Option<bool>,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            case_insensitive: Some(false),
            glob: None,
            max_results: Some(100),
            context_lines: Some(0),
            hidden: Some(false),
        }
    }
}

#[napi(object)]
pub struct SearchResult {
    pub matches: Vec<SearchMatch>,
    pub total_count: u32,
    pub files_searched: u32,
}

#[napi(object)]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: u32,
    pub column: u32,
    pub line_content: String,
    pub match_text: String,
}

#[napi(object)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub content: String,
}
