//! Fast file search using ripgrep with openat() for long path support
//!
//! Uses file descriptors to navigate directories, bypassing PATH_MAX limits.
//! This allows searching paths longer than 4096 bytes on Unix systems.

use crate::{SearchMatch, SearchOptions, SearchResult};
use grep::regex::RegexMatcher;
use grep::searcher::sinks::UTF8;
use grep::searcher::SearcherBuilder;
use nix::dir::{Dir, Type};
use nix::fcntl::{openat, OFlag};
use nix::sys::stat::Mode;
use std::collections::VecDeque;
use std::os::unix::io::{AsRawFd, RawFd};
use std::path::Path;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

/// Maximum individual filename component length (255 on most Unix)
const MAX_NAME_LENGTH: usize = 255;

/// Check if a name should be ignored (hidden files, gitignore patterns)
fn should_skip(name: &std::ffi::CStr, options: &SearchOptions) -> bool {
    let name_bytes = name.to_bytes();

    // Skip empty or . / ..
    if name_bytes.is_empty() || name_bytes == b"." || name_bytes == b".." {
        return true;
    }

    // Skip hidden files unless requested
    if !options.hidden.unwrap_or(false) && name_bytes.starts_with(b".") {
        return true;
    }

    // Skip very long filenames that exceed component limit
    if name_bytes.len() > MAX_NAME_LENGTH {
        return true;
    }

    // Common ignore patterns
    let name_str = match std::str::from_utf8(name_bytes) {
        Ok(s) => s,
        Err(_) => return false, // Binary name, allow it
    };

    // Skip common directories that should always be ignored
    matches!(
        name_str,
        "node_modules"
            | ".git"
            | ".hg"
            | ".svn"
            | "target"
            | "dist"
            | ".next"
            | ".nuxt"
            | "build"
            | "__pycache__"
            | ".pytest_cache"
            | ".mypy_cache"
            | ".tox"
            | "venv"
            | ".venv"
            | "env"
            | ".env"
            | ".idea"
            | ".vscode"
            | ".DS_Store"
    )
}

/// Directory entry with its file descriptor and display path
struct DirEntry {
    dir: Dir,
    path: String,
}

pub fn search_files(pattern: &str, path: &str, options: SearchOptions) -> anyhow::Result<SearchResult> {
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

    // Open starting directory
    let start_path = Path::new(path);
    let start_dir = Dir::open(
        start_path,
        OFlag::O_RDONLY | OFlag::O_DIRECTORY,
        Mode::empty(),
    )?;

    // BFS queue of directories to process
    let mut queue: VecDeque<DirEntry> = VecDeque::new();
    queue.push_back(DirEntry {
        dir: start_dir,
        path: path.to_string(),
    });

    // Process directories
    while let Some(DirEntry { dir, path: current_path }) = queue.pop_front() {
        let fd = dir.as_raw_fd();

        // Check if we have enough results
        {
            let m = matches.lock().unwrap();
            if m.len() >= max_results {
                break;
            }
        }

        // Iterate directory entries
        for entry in dir.iter() {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let name = entry.file_name();
            let name_bytes = name.to_bytes();

            // Skip unwanted entries
            if should_skip(&name, &options) {
                continue;
            }

            let name_str = match std::str::from_utf8(name_bytes) {
                Ok(s) => s,
                Err(_) => continue, // Skip non-UTF8 names
            };

            // Build display path (can be arbitrarily long - just for display)
            let entry_path = if current_path.ends_with('/') {
                format!("{}{}", current_path, name_str)
            } else {
                format!("{}/{}", current_path, name_str)
            };

            match entry.file_type() {
                Some(Type::Directory) => {
                    // Open subdirectory using openat() - no full path needed for syscall
                    match openat(
                        fd,
                        name,
                        OFlag::O_RDONLY | OFlag::O_DIRECTORY,
                        Mode::empty(),
                    ) {
                        Ok(sub_fd) => {
                            match Dir::from_fd(sub_fd) {
                                Ok(sub_dir) => {
                                    queue.push_back(DirEntry {
                                        dir: sub_dir,
                                        path: entry_path,
                                    });
                                }
                                Err(_) => {
                                    // Close the fd if Dir::from_fd fails
                                    let _ = nix::unistd::close(sub_fd);
                                }
                            }
                        }
                        Err(_) => continue, // Can't open, skip
                    }
                }
                Some(Type::File) | Some(Type::Symlink) | None => {
                    // Try to search file using openat()
                    files_searched.fetch_add(1, Ordering::Relaxed);

                    // Open file relative to directory fd
                    let file_fd = match openat(
                        fd,
                        name,
                        OFlag::O_RDONLY,
                        Mode::empty(),
                    ) {
                        Ok(fd) => fd,
                        Err(_) => continue,
                    };

                    // Create a File from the fd for grep searcher
                    let file = match std::fs::File::from_raw_fd(file_fd) {
                        f => f,
                    };

                    // Search file using file descriptor
                    // Note: We use the display path for results, but actual IO uses fd
                    let matches_clone = matches.clone();
                    let pattern_str = pattern.to_string();
                    let matcher_clone = matcher.clone();
                    let mut searcher_clone = searcher.clone();
                    let entry_path_clone = entry_path.clone();

                    let _ = searcher_clone.search_file(
                        &matcher_clone,
                        &file,
                        UTF8(|line_num, line| {
                            let mut m = matches_clone.lock().unwrap();
                            if m.len() >= max_results {
                                return Ok(false);
                            }

                            m.push(SearchMatch {
                                file_path: entry_path_clone.clone(),
                                line_number: line_num as u32,
                                column: 1,
                                line_content: line.to_string(),
                                match_text: pattern_str.clone(),
                            });

                            Ok(true)
                        }),
                    );

                    // File is closed when dropped
                }
                _ => continue, // Skip other types (sockets, pipes, etc.)
            }
        }
    }

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
