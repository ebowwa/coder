//! Comprehensive grep implementation with ripgrep-like features
//!
//! Features:
//! - Pattern matching (regex, literal, whole-word, case-sensitive)
//! - Context lines (before/after)
//! - Column position and byte offsets
//! - Recursive directory search with depth control
//! - Include/exclude patterns (glob-based)
//! - Output modes (normal, count, files-with-matches)
//! - Invert matching
//! - Binary file handling
//! - Hidden file handling
//! - Performance optimizations (parallel, streaming, mmap)

mod types;
mod matcher;
mod walker;
mod search;
mod filter;

// Re-export all types from types module
pub use types::*;
pub use matcher::{PatternMatcher, MatchResult};
pub use walker::{FileWalker, WalkConfig, ManualWalker};
pub use search::{GrepSearcher, ParallelSearcher, StreamingSearcher};
// CountResult is already exported via types::* above
pub use filter::{FileFilter, BinaryDetector};

use std::path::{Path, PathBuf};
use tokio::task::JoinSet;

/// Main grep search function
pub async fn grep_search(
    pattern: &str,
    path: &Path,
    opts: &GrepOptions,
) -> anyhow::Result<Vec<GrepLine>> {
    let config = SearchConfig::from_options(opts);
    let matcher = PatternMatcher::new(pattern, &config)?;
    let walker = FileWalker::new(path, &config);
    let filter = FileFilter::new(&config);

    let mut results: Vec<GrepLine> = Vec::new();
    let max_results = opts.max_results.unwrap_or(u32::MAX) as usize;

    let mut join_set = JoinSet::new();

    // Walk the directory tree
    for entry_result in walker.walk() {
        let entry = entry_result?;

        // Apply filters
        if !filter.should_process(&entry) {
            continue;
        }

        let matcher = matcher.clone();
        let config = config.clone();
        let entry_path = entry.path().to_path_buf();

        join_set.spawn(async move {
            GrepSearcher::search_file(&entry_path, &matcher, &config).await
        });

        // Early exit if we have enough pending tasks
        if join_set.len() >= 100 {
            while let Some(task_result) = join_set.join_next().await {
                match task_result {
                    Ok(Ok(file_results)) => {
                        results.extend(file_results);
                        if results.len() >= max_results {
                            join_set.shutdown().await;
                            break;
                        }
                    }
                    _ => continue,
                }
            }
        }
    }

    // Collect remaining results
    while let Some(task_result) = join_set.join_next().await {
        match task_result {
            Ok(Ok(file_results)) => {
                results.extend(file_results);
                if results.len() >= max_results {
                    break;
                }
            }
            _ => continue,
        }
    }

    // Truncate to max results
    results.truncate(max_results);

    Ok(results)
}

/// Parallel grep search using ParallelSearcher
pub async fn grep_search_parallel(
    pattern: &str,
    path: &Path,
    opts: &GrepOptions,
) -> anyhow::Result<Vec<GrepLine>> {
    let config = SearchConfig::from_options(opts);
    let searcher = ParallelSearcher::new(pattern, config.clone())?;
    let walker = FileWalker::new(path, &config);
    let filter = FileFilter::new(&config);

    // Collect all file paths first
    let mut paths: Vec<PathBuf> = Vec::new();
    for entry_result in walker.walk() {
        let entry = entry_result?;
        if filter.should_process(&entry) {
            paths.push(entry.path().to_path_buf());
        }
    }

    // Search in parallel
    let results = searcher.search_files(paths).await;

    // Flatten and truncate
    let mut all_matches: Vec<GrepLine> = Vec::new();
    let max_results = opts.max_results.unwrap_or(u32::MAX) as usize;

    for (_, file_result) in results {
        match file_result {
            Ok(matches) => {
                all_matches.extend(matches);
                if all_matches.len() >= max_results {
                    break;
                }
            }
            Err(_) => continue,
        }
    }

    all_matches.truncate(max_results);
    Ok(all_matches)
}

/// Streaming grep search using StreamingSearcher (memory efficient for large files)
pub async fn grep_search_streaming(
    pattern: &str,
    path: &Path,
    opts: &GrepOptions,
) -> anyhow::Result<Vec<GrepLine>> {
    let config = SearchConfig::from_options(opts);
    let searcher = StreamingSearcher::new(pattern, config.clone())?;
    let walker = FileWalker::new(path, &config);
    let filter = FileFilter::new(&config);

    let mut results: Vec<GrepLine> = Vec::new();
    let max_results = opts.max_results.unwrap_or(u32::MAX) as usize;

    for entry_result in walker.walk() {
        let entry = entry_result?;

        if !filter.should_process(&entry) {
            continue;
        }

        let file_path = entry.path();
        let results = &mut results;

        searcher.search_streaming(file_path, |grep_line| {
            if results.len() < max_results {
                results.push(grep_line);
            }
        }).await?;

        if results.len() >= max_results {
            break;
        }
    }

    Ok(results)
}

/// Manual walk grep search using ManualWalker (synchronous, controlled traversal)
pub fn grep_search_manual(
    pattern: &str,
    path: &Path,
    opts: &GrepOptions,
) -> anyhow::Result<Vec<GrepLine>> {
    let config = SearchConfig::from_options(opts);
    let matcher = PatternMatcher::new(pattern, &config)?;
    let mut walker = ManualWalker::new(path, &config);

    let mut results: Vec<GrepLine> = Vec::new();
    let max_results = opts.max_results.unwrap_or(u32::MAX) as usize;

    // Use tokio runtime for async search
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        while let Some(file_path) = walker.next_file() {
            match GrepSearcher::search_file(&file_path, &matcher, &config).await {
                Ok(file_results) => {
                    results.extend(file_results);
                if results.len() >= max_results {
                    break;
                }
            }
            Err(_) => continue,
            }
        }
    });

    results.truncate(max_results);
    Ok(results)
}
