//! Type definitions for the grep module

use std::path::PathBuf;

/// A single match result from grep
#[derive(Debug, Clone)]
pub struct GrepLine {
    /// File path containing the match
    pub path: PathBuf,
    /// 1-based line number
    pub line_number: u64,
    /// 1-based column number (start of match)
    pub column: u32,
    /// The matched line content
    pub line: String,
    /// Byte offset from start of file
    pub byte_offset: u64,
    /// Length of the match in bytes
    pub match_length: u32,
    /// Lines before the match (for context)
    pub context_before: Vec<String>,
    /// Lines after the match (for context)
    pub context_after: Vec<String>,
}

/// Configuration options for grep search
#[derive(Debug, Clone, Default)]
pub struct GrepOptions {
    /// Case insensitive matching
    pub case_insensitive: bool,
    /// Maximum number of results to return
    pub max_results: Option<u32>,
    /// Glob patterns for files to include (e.g., ["*.ts", "*.rs"])
    pub include_patterns: Vec<String>,
    /// Glob patterns for files/dirs to exclude (e.g., ["node_modules", "*.lock"])
    pub exclude_patterns: Vec<String>,

    // === Pattern Options ===
    /// Treat pattern as literal string (no regex)
    pub literal: bool,
    /// Match whole words only (word boundaries)
    pub whole_word: bool,
    /// Invert match (show non-matching lines)
    pub invert: bool,
    /// Enable multiline matching
    pub multiline: bool,

    // === Context Options ===
    /// Number of lines to show before match
    pub context_before: Option<u32>,
    /// Number of lines to show after match
    pub context_after: Option<u32>,
    /// Shorthand for setting both context_before and context_after
    pub context: Option<u32>,

    // === Output Mode ===
    /// Output mode: "normal", "count", "files-with-matches"
    pub output_mode: OutputMode,

    // === Directory Traversal ===
    /// Maximum directory depth (None = unlimited)
    pub max_depth: Option<u32>,
    /// Follow symbolic links
    pub follow_symlinks: bool,
    /// Skip hidden files and directories
    pub skip_hidden: bool,
    /// Respect .gitignore rules
    pub respect_gitignore: bool,

    // === File Filtering ===
    /// Skip binary files
    pub skip_binary: bool,
    /// Maximum file size in bytes (skip larger files)
    pub max_filesize: Option<u64>,
    /// File extensions to include (e.g., ["ts", "rs", "js"])
    pub extensions: Vec<String>,
    /// Skip files matching these exact names
    pub skip_files: Vec<String>,

    // === Performance ===
    /// Number of parallel workers (0 = auto)
    pub parallel_workers: u32,
    /// Use memory-mapped files for large files
    pub use_mmap: bool,
    /// Size threshold for mmap (bytes)
    pub mmap_threshold: Option<u64>,
}

/// Output mode for grep results
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum OutputMode {
    /// Normal output with line content
    #[default]
    Normal,
    /// Only count matches per file
    Count,
    /// Only list files with matches
    FilesWithMatches,
}

/// Internal search configuration derived from GrepOptions
#[derive(Debug, Clone)]
pub struct SearchConfig {
    // Pattern options
    pub case_insensitive: bool,
    pub literal: bool,
    pub whole_word: bool,
    pub invert: bool,
    pub multiline: bool,

    // Context
    pub context_before: usize,
    pub context_after: usize,

    // Output
    pub output_mode: OutputMode,

    // Traversal
    pub max_depth: Option<usize>,
    pub follow_symlinks: bool,
    pub skip_hidden: bool,

    // Filtering
    pub skip_binary: bool,
    pub max_filesize: Option<u64>,
    pub include_globs: Vec<glob::Pattern>,
    pub exclude_globs: Vec<glob::Pattern>,
    pub extensions: Vec<String>,
    pub skip_files: Vec<String>,

    // Performance
    pub use_mmap: bool,
    pub mmap_threshold: u64,
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            case_insensitive: false,
            literal: false,
            whole_word: false,
            invert: false,
            multiline: false,
            context_before: 0,
            context_after: 0,
            output_mode: OutputMode::Normal,
            max_depth: None,
            follow_symlinks: false,
            skip_hidden: true,
            skip_binary: true,
            max_filesize: Some(10 * 1024 * 1024), // 10MB
            include_globs: Vec::new(),
            exclude_globs: Vec::new(),
            extensions: Vec::new(),
            skip_files: Vec::new(),
            use_mmap: false,
            mmap_threshold: 1024 * 1024, // 1MB
        }
    }
}

impl SearchConfig {
    /// Convert GrepOptions to SearchConfig
    pub fn from_options(opts: &GrepOptions) -> Self {
        let context = opts.context.unwrap_or(0);
        let context_before = opts.context_before.unwrap_or(context) as usize;
        let context_after = opts.context_after.unwrap_or(context) as usize;

        // Parse glob patterns
        let include_globs = opts.include_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();

        let exclude_globs = opts.exclude_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();

        Self {
            case_insensitive: opts.case_insensitive,
            literal: opts.literal,
            whole_word: opts.whole_word,
            invert: opts.invert,
            multiline: opts.multiline,
            context_before,
            context_after,
            output_mode: opts.output_mode,
            max_depth: opts.max_depth.map(|d| d as usize),
            follow_symlinks: opts.follow_symlinks,
            skip_hidden: opts.skip_hidden,
            skip_binary: opts.skip_binary,
            max_filesize: opts.max_filesize,
            include_globs,
            exclude_globs,
            extensions: opts.extensions.clone(),
            skip_files: opts.skip_files.clone(),
            use_mmap: opts.use_mmap,
            mmap_threshold: opts.mmap_threshold.unwrap_or(1024 * 1024),
        }
    }
}

/// Result of counting matches in a file
#[derive(Debug, Clone)]
pub struct CountResult {
    /// File path
    pub path: PathBuf,
    /// Number of matches
    pub count: u64,
    /// Number of lines with matches
    pub line_count: u64,
}

/// Statistics about a search
#[derive(Debug, Clone, Default)]
pub struct SearchStats {
    /// Total files searched
    pub files_searched: u64,
    /// Total files skipped
    pub files_skipped: u64,
    /// Total bytes read
    pub bytes_read: u64,
    /// Time spent searching (ms)
    pub search_time_ms: u64,
    /// Number of matches found
    pub total_matches: u64,
}
