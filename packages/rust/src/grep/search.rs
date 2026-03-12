//! Main search implementation for grep

use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use memmap2::Mmap;

use crate::grep::types::*;
use crate::grep::matcher::{PatternMatcher, MatchResult};
use crate::grep::filter::BinaryDetector;

/// Main grep searcher
pub struct GrepSearcher;

impl GrepSearcher {
    /// Search a single file and return all matches
    pub async fn search_file(
        path: &Path,
        matcher: &PatternMatcher,
        config: &SearchConfig,
    ) -> anyhow::Result<Vec<GrepLine>> {
        // Read file content
        let content = Self::read_file(path, config).await?;

        // Check for binary content
        if config.skip_binary && BinaryDetector::is_binary(&content) {
            return Ok(Vec::new());
        }

        // Convert to string (lossy for non-UTF8)
        let text = String::from_utf8_lossy(&content);

        // Search content
        let matches = matcher.search_content(&text);

        // Build results with context
        let results = Self::build_results(&text, &matches, path, config);

        Ok(results)
    }

    /// Read file content with optional mmap support
    async fn read_file(path: &Path, config: &SearchConfig) -> std::io::Result<Vec<u8>> {
        let metadata = tokio::fs::metadata(path).await?;
        let file_size = metadata.len();

        // Use mmap for large files if enabled
        if config.use_mmap && file_size >= config.mmap_threshold {
            // For mmap, we need to use std::fs since mmap is sync
            let file = std::fs::File::open(path)?;
            let mmap = unsafe { Mmap::map(&file)? };
            Ok(mmap.to_vec())
        } else {
            // Regular async read
            let mut content = Vec::with_capacity(file_size as usize);
            tokio::fs::File::open(path).await?.read_to_end(&mut content).await?;
            Ok(content)
        }
    }

    /// Build grep results with context lines
    fn build_results(
        text: &str,
        matches: &[MatchResult],
        path: &Path,
        config: &SearchConfig,
    ) -> Vec<GrepLine> {
        let lines: Vec<&str> = text.lines().collect();
        let mut results = Vec::new();

        for match_result in matches {
            let line_idx = (match_result.line_number - 1) as usize;

            // Get the line content
            let line = if line_idx < lines.len() {
                lines[line_idx].to_string()
            } else {
                continue;
            };

            // Get context before
            let context_before = if config.context_before > 0 {
                let start = line_idx.saturating_sub(config.context_before);
                (start..line_idx)
                    .map(|i| lines.get(i).unwrap_or(&"").to_string())
                    .collect()
            } else {
                Vec::new()
            };

            // Get context after
            let context_after = if config.context_after > 0 {
                let end = (line_idx + 1 + config.context_after).min(lines.len());
                ((line_idx + 1)..end)
                    .map(|i| lines.get(i).unwrap_or(&"").to_string())
                    .collect()
            } else {
                Vec::new()
            };

            results.push(GrepLine {
                path: path.to_path_buf(),
                line_number: match_result.line_number,
                column: match_result.column,
                line,
                byte_offset: match_result.byte_offset,
                match_length: match_result.match_length,
                context_before,
                context_after,
            });
        }

        results
    }

    /// Search a file and return count of matches
    pub async fn search_count(
        path: &Path,
        matcher: &PatternMatcher,
        config: &SearchConfig,
    ) -> anyhow::Result<CountResult> {
        let content = Self::read_file(path, config).await?;

        if config.skip_binary && BinaryDetector::is_binary(&content) {
            return Ok(CountResult {
                path: path.to_path_buf(),
                count: 0,
                line_count: 0,
            });
        }

        let text = String::from_utf8_lossy(&content);
        let matches = matcher.search_content(&text);

        let count = matches.len() as u64;
        let line_count = text.lines().count() as u64;

        Ok(CountResult {
            path: path.to_path_buf(),
            count,
            line_count,
        })
    }

    /// Check if a file has any matches
    pub async fn has_matches(
        path: &Path,
        matcher: &PatternMatcher,
        config: &SearchConfig,
    ) -> anyhow::Result<bool> {
        let content = Self::read_file(path, config).await?;

        if config.skip_binary && BinaryDetector::is_binary(&content) {
            return Ok(false);
        }

        let text = String::from_utf8_lossy(&content);
        Ok(matcher.is_match(&text))
    }
}

/// Parallel search coordinator
pub struct ParallelSearcher {
    config: SearchConfig,
    matcher: PatternMatcher,
}

impl ParallelSearcher {
    pub fn new(pattern: &str, config: SearchConfig) -> anyhow::Result<Self> {
        let matcher = PatternMatcher::new(pattern, &config)?;
        Ok(Self { config, matcher })
    }

    /// Search multiple files in parallel
    pub async fn search_files(
        &self,
        paths: Vec<PathBuf>,
    ) -> Vec<(PathBuf, anyhow::Result<Vec<GrepLine>>)> {
        let matcher = Arc::new(self.matcher.clone());
        let config = Arc::new(self.config.clone());

        let mut tasks = tokio::task::JoinSet::new();

        for path in paths {
            let matcher = matcher.clone();
            let config = config.clone();

            tasks.spawn(async move {
                let result = GrepSearcher::search_file(&path, &matcher, &config).await;
                (path, result)
            });
        }

        let mut results = Vec::new();
        while let Some(task_result) = tasks.join_next().await {
            if let Ok((path, result)) = task_result {
                results.push((path, result));
            }
        }

        results
    }
}

/// Streaming search for large files
pub struct StreamingSearcher {
    config: SearchConfig,
    matcher: PatternMatcher,
}

impl StreamingSearcher {
    pub fn new(pattern: &str, config: SearchConfig) -> anyhow::Result<Self> {
        let matcher = PatternMatcher::new(pattern, &config)?;
        Ok(Self { config, matcher })
    }

    /// Search a file line by line (memory efficient for large files)
    pub async fn search_streaming<F>(
        &self,
        path: &Path,
        mut callback: F,
    ) -> anyhow::Result<()>
    where
        F: FnMut(GrepLine) + Send,
    {
        use tokio::io::{BufReader, AsyncBufReadExt};

        let file = tokio::fs::File::open(path).await?;
        let reader = BufReader::new(file);
        let mut lines = reader.lines();

        let mut line_number = 0u64;
        let mut byte_offset = 0u64;

        // Context buffer
        let mut context_buffer: std::collections::VecDeque<(u64, String)> =
            std::collections::VecDeque::with_capacity(self.config.context_before + 1);

        while let Some(line) = lines.next_line().await? {
            line_number += 1;
            let line_len = line.len() as u64 + 1; // +1 for newline

            if let Some(_match_result) = self.matcher.search_line(&line, line_number, byte_offset) {
                // Build context before
                let context_before: Vec<String> = context_buffer
                    .iter()
                    .map(|(_, l)| l.clone())
                    .collect();

                // Get context after (simplified - no peek ahead)
                let context_after = Vec::new();

                callback(GrepLine {
                    path: path.to_path_buf(),
                    line_number,
                    column: 1,
                    line: line.clone(),
                    byte_offset,
                    match_length: line.len() as u32,
                    context_before,
                    context_after,
                });
            }

            // Update context buffer
            context_buffer.push_back((line_number, line.clone()));
            if context_buffer.len() > self.config.context_before {
                context_buffer.pop_front();
            }

            byte_offset += line_len;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    async fn create_test_file(content: &str) -> (TempDir, PathBuf) {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("test.txt");
        fs::write(&path, content).unwrap();
        (tmp, path)
    }

    #[tokio::test]
    async fn test_basic_search() {
        let content = "hello world\nfoo bar\nhello again\n";
        let (_tmp, path) = create_test_file(content).await;

        let config = SearchConfig::default();
        let matcher = PatternMatcher::new("hello", &config).unwrap();

        let results = GrepSearcher::search_file(&path, &matcher, &config).await.unwrap();

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].line_number, 1);
        assert_eq!(results[1].line_number, 3);
    }

    #[tokio::test]
    async fn test_context_lines() {
        let content = "line 1\nline 2\nMATCH\nline 4\nline 5\n";
        let (_tmp, path) = create_test_file(content).await;

        let mut config = SearchConfig::default();
        config.context_before = 1;
        config.context_after = 1;

        let matcher = PatternMatcher::new("MATCH", &config).unwrap();
        let results = GrepSearcher::search_file(&path, &matcher, &config).await.unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].context_before, vec!["line 2"]);
        assert_eq!(results[0].context_after, vec!["line 4"]);
    }

    #[tokio::test]
    async fn test_parallel_search() {
        let tmp = TempDir::new().unwrap();

        // Create multiple test files
        fs::write(tmp.path().join("a.txt"), "hello\n").unwrap();
        fs::write(tmp.path().join("b.txt"), "hello\nhello\n").unwrap();
        fs::write(tmp.path().join("c.txt"), "world\n").unwrap();

        let config = SearchConfig::default();
        let searcher = ParallelSearcher::new("hello", config).unwrap();

        let paths = vec![
            tmp.path().join("a.txt"),
            tmp.path().join("b.txt"),
            tmp.path().join("c.txt"),
        ];

        let results = searcher.search_files(paths).await;

        let total_matches: usize = results
            .iter()
            .filter_map(|(_, r)| r.as_ref().ok())
            .map(|v| v.len())
            .sum();

        assert_eq!(total_matches, 3); // 1 from a.txt + 2 from b.txt
    }

    #[tokio::test]
    async fn test_streaming_search() {
        let content = "hello\nworld\nhello\nhello\n";
        let (_tmp, path) = create_test_file(content).await;

        let config = SearchConfig::default();
        let searcher = StreamingSearcher::new("hello", config).unwrap();

        let mut matches = Vec::new();
        searcher.search_streaming(&path, |grep_line| {
            matches.push(grep_line);
        }).await.unwrap();

        assert_eq!(matches.len(), 3);
    }
}
