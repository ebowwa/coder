//! Directory walking logic for grep

use std::path::{Path, PathBuf};
use std::collections::VecDeque;
use ignore::{WalkBuilder, DirEntry};
use crate::grep::types::SearchConfig;

/// Configuration for directory walking
#[derive(Debug, Clone)]
pub struct WalkConfig {
    pub max_depth: Option<usize>,
    pub follow_symlinks: bool,
    pub skip_hidden: bool,
    pub respect_gitignore: bool,
    pub include_globs: Vec<glob::Pattern>,
    pub exclude_globs: Vec<glob::Pattern>,
}

impl From<&SearchConfig> for WalkConfig {
    fn from(config: &SearchConfig) -> Self {
        Self {
            max_depth: config.max_depth,
            follow_symlinks: config.follow_symlinks,
            skip_hidden: config.skip_hidden,
            respect_gitignore: false,
            include_globs: config.include_globs.clone(),
            exclude_globs: config.exclude_globs.clone(),
        }
    }
}

/// File walker using the ignore crate for efficient directory traversal
pub struct FileWalker {
    path: PathBuf,
    config: WalkConfig,
}

impl FileWalker {
    /// Create a new file walker
    pub fn new(path: &Path, config: &SearchConfig) -> Self {
        Self {
            path: path.to_path_buf(),
            config: WalkConfig::from(config),
        }
    }

    /// Walk the directory tree and return an iterator over file entries
    pub fn walk(self) -> impl Iterator<Item = anyhow::Result<DirEntry>> {
        let mut builder = WalkBuilder::new(&self.path);

        builder
            .follow_links(self.config.follow_symlinks)
            .hidden(self.config.skip_hidden)
            .git_ignore(self.config.respect_gitignore)
            .git_global(self.config.respect_gitignore)
            .git_exclude(self.config.respect_gitignore);

        if let Some(depth) = self.config.max_depth {
            builder.max_depth(Some(depth));
        }

        let include_globs = self.config.include_globs.clone();
        let exclude_globs = self.config.exclude_globs.clone();

        builder.filter_entry(move |entry| {
            let path = entry.path();

            // Always allow directories (they'll be filtered by ignore crate)
            if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                let path_str = path.to_string_lossy();
                for pattern in &exclude_globs {
                    if pattern.matches(&path_str)
                        || pattern.matches(path.file_name().and_then(|n| n.to_str()).unwrap_or(""))
                    {
                        return false;
                    }
                }
                return true;
            }

            // For files, check include/exclude patterns
            let path_str = path.to_string_lossy();
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            // Check exclude patterns first
            for pattern in &exclude_globs {
                if pattern.matches(&path_str) || pattern.matches(file_name) {
                    return false;
                }
            }

            // If include patterns are specified, file must match at least one
            if !include_globs.is_empty() {
                let matches_include = include_globs.iter().any(|pattern| {
                    pattern.matches(&path_str) || pattern.matches(file_name)
                });
                if !matches_include {
                    return false;
                }
            }

            true
        });

        builder.build().into_iter().filter_map(|result| {
            match result {
                Ok(entry) => {
                    // Only yield files, not directories
                    if entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                        Some(Ok(entry))
                    } else {
                        None
                    }
                }
                Err(e) => Some(Err(anyhow::anyhow!("Walk error: {}", e))),
            }
        })
    }
}

/// Manual directory walker for cases where we need more control
pub struct ManualWalker {
    path: PathBuf,
    config: WalkConfig,
    queue: VecDeque<PathBuf>,
}

impl ManualWalker {
    /// Create a new manual walker
    pub fn new(path: &Path, config: &SearchConfig) -> Self {
        let mut queue = VecDeque::new();
        queue.push_back(path.to_path_buf());

        Self {
            path: path.to_path_buf(),
            config: WalkConfig::from(config),
            queue,
        }
    }

    /// Get next file to process
    pub fn next_file(&mut self) -> Option<PathBuf> {
        while let Some(current_path) = self.queue.pop_front() {
            if current_path.is_file() {
                if self.should_include(&current_path) {
                    return Some(current_path);
                }
            } else if current_path.is_dir() {
                if self.should_descend(&current_path) {
                    if let Ok(entries) = std::fs::read_dir(&current_path) {
                        for entry in entries.flatten() {
                            self.queue.push_back(entry.path());
                        }
                    }
                }
            }
        }
        None
    }

    fn should_descend(&self, dir: &Path) -> bool {
        // Check depth limit
        if let Some(max_depth) = self.config.max_depth {
            let current = dir.components().count();
            let base = self.path.components().count();
            if current - base >= max_depth {
                return false;
            }
        }

        // Check exclude patterns
        let path_str = dir.to_string_lossy();
        for pattern in &self.config.exclude_globs {
            if pattern.matches(&path_str) {
                return false;
            }
        }

        // Skip hidden directories (but not the root directory we started from)
        if self.config.skip_hidden && dir != self.path {
            if let Some(name) = dir.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.') {
                    return false;
                }
            }
        }

        true
    }

    fn should_include(&self, file: &Path) -> bool {
        let path_str = file.to_string_lossy();
        let file_name = file.file_name().and_then(|n| n.to_str()).unwrap_or("");

        // Check exclude patterns
        for pattern in &self.config.exclude_globs {
            if pattern.matches(&path_str) || pattern.matches(file_name) {
                return false;
            }
        }

        // Check include patterns
        if !self.config.include_globs.is_empty() {
            let matches = self.config.include_globs.iter().any(|pattern| {
                pattern.matches(&path_str) || pattern.matches(file_name)
            });
            if !matches {
                return false;
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use tempfile::TempDir;

    fn create_test_tree() -> TempDir {
        let tmp = TempDir::new().unwrap();

        let src = tmp.path().join("src");
        let node_modules = tmp.path().join("node_modules");

        fs::create_dir_all(&src).unwrap();
        fs::create_dir_all(&node_modules).unwrap();

        File::create(src.join("main.rs")).unwrap();
        File::create(src.join("lib.rs")).unwrap();
        File::create(node_modules.join("package.json")).unwrap();
        File::create(tmp.path().join(".hidden")).unwrap();
        File::create(tmp.path().join("test.ts")).unwrap();

        tmp
    }

    #[test]
    fn test_basic_walk() {
        let tmp = create_test_tree();
        let config = SearchConfig::default();
        let walker = FileWalker::new(tmp.path(), &config);

        let files: Vec<_> = walker.walk().filter_map(|e| e.ok()).collect();

        assert!(files.iter().any(|f| f.path().ends_with("main.rs")));
        assert!(files.iter().any(|f| f.path().ends_with("lib.rs")));
    }

    #[test]
    fn test_include_pattern() {
        let tmp = create_test_tree();
        let mut config = SearchConfig::default();
        config.include_globs = vec![glob::Pattern::new("*.rs").unwrap()];

        let walker = FileWalker::new(tmp.path(), &config);
        let files: Vec<_> = walker.walk().filter_map(|e| e.ok()).collect();

        assert!(files
            .iter()
            .all(|f| f.path().extension().map(|e| e == "rs").unwrap_or(false)));
    }

    #[test]
    fn test_exclude_pattern() {
        let tmp = create_test_tree();
        let mut config = SearchConfig::default();
        // Use "node_modules" pattern to match the directory name
        // glob::Pattern doesn't support ** globstar, so we match on the dir name
        config.exclude_globs = vec![glob::Pattern::new("node_modules").unwrap()];

        let walker = FileWalker::new(tmp.path(), &config);
        let files: Vec<_> = walker.walk().filter_map(|e| e.ok()).collect();

        assert!(!files
            .iter()
            .any(|f| f.path().to_str().unwrap().contains("node_modules")));
    }

    #[test]
    fn test_manual_walker() {
        let tmp = create_test_tree();
        let config = SearchConfig::default();
        let mut walker = ManualWalker::new(tmp.path(), &config);

        let mut count = 0;
        while walker.next_file().is_some() {
            count += 1;
        }

        assert!(count > 0);
    }
}
