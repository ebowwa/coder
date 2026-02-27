//! Fast file search using ripgrep

use crate::{SearchMatch, SearchOptions, SearchResult};
use grep::regex::RegexMatcher;
use grep::searcher::sinks::UTF8;
use grep::searcher::SearcherBuilder;
use ignore::{WalkBuilder, WalkState};
use std::path::Path;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

pub fn search_files(pattern: &str, path: &str, options: SearchOptions) -> anyhow::Result<SearchResult> {
    let path = Path::new(path);
    let matches = Arc::new(std::sync::Mutex::new(Vec::new()));
    let files_searched = Arc::new(AtomicU32::new(0));
    let max_results = options.max_results.unwrap_or(100) as usize;

    // Build matcher
    let matcher = if options.case_insensitive.unwrap_or(false) {
        RegexMatcher::new(&format!("(?i){}", pattern))?
    } else {
        RegexMatcher::new(pattern)?
    };

    // Build searcher
    let searcher = SearcherBuilder::new()
        .line_number(true)
        .build();

    // Build walker
    let mut walker_builder = WalkBuilder::new(path);
    walker_builder
        .hidden(!options.hidden.unwrap_or(false))
        .git_ignore(true)
        .git_global(true);

    if let Some(glob) = &options.glob {
        walker_builder.add_custom_ignore_filename(glob);
    }

    let walker = walker_builder.build_parallel();

    // Search in parallel
    let matches_clone = matches.clone();
    let files_searched_clone = files_searched.clone();

    walker.run(|| {
        let matches = matches_clone.clone();
        let files_searched = files_searched_clone.clone();
        let matcher = matcher.clone();
        let mut searcher = searcher.clone();
        let max_results = max_results;

        Box::new(move |result| {
            let entry = match result {
                Ok(entry) => entry,
                Err(_) => return WalkState::Continue,
            };

            // Skip directories
            if !entry.file_type().map_or(false, |ft| ft.is_file()) {
                return WalkState::Continue;
            }

            files_searched.fetch_add(1, Ordering::Relaxed);

            let path = entry.path();

            // Search file
            let _ = searcher.search_path(
                &matcher,
                path,
                UTF8(|line_num, line| {
                    let mut m = matches.lock().unwrap();
                    if m.len() >= max_results {
                        return Ok(false); // Stop searching
                    }

                    m.push(SearchMatch {
                        file_path: path.display().to_string(),
                        line_number: line_num as u32,
                        column: 1,
                        line_content: line.to_string(),
                        match_text: pattern.to_string(),
                    });

                    Ok(true)
                }),
            );

            let m = matches.lock().unwrap();
            if m.len() >= max_results {
                WalkState::Quit
            } else {
                WalkState::Continue
            }
        })
    });

    let matches = Arc::try_unwrap(matches)
        .map_err(|_| anyhow::anyhow!("Failed to unwrap matches"))?
        .into_inner()?;

    let total_count = matches.len() as u32;

    Ok(SearchResult {
        matches,
        total_count,
        files_searched: files_searched.load(Ordering::Relaxed),
    })
}
