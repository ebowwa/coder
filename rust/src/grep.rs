use std::path::{Path, PathBuf};
use tokio::task::JoinSet;

#[derive(Debug, Clone)]
pub struct GrepLine {
    pub path: PathBuf,
    pub line_number: u64,
    pub line: String,
    pub byte_offset: u64,
}

#[derive(Debug, Clone, Default)]
pub struct GrepOptions {
    pub case_insensitive: bool,
    pub max_results: Option<u32>,
    pub include_patterns: Vec<String>,
    pub exclude_patterns: Vec<String>,
}

pub async fn grep_search(
    pattern: &str,
    path: &Path,
    opts: GrepOptions,
) -> anyhow::Result<Vec<GrepLine>> {
    let mut results = Vec::new();
    let re = regex::Regex::new(
        &if opts.case_insensitive {
            format!("(?i){}", pattern)
        } else {
            pattern.to_string()
        }
    )?;

    let max_results = opts.max_results.unwrap_or(u32::MAX) as usize;

    async fn search_file(
        path: &Path,
        re: &regex::Regex,
    ) -> anyhow::Result<Vec<GrepLine>> {
        let mut results = Vec::new();
        let file_content = tokio::fs::read_to_string(path).await?;

        for (line_num, line) in file_content.lines().enumerate() {
            if re.is_match(line) {
                results.push(GrepLine {
                    path: path.to_path_buf(),
                    line_number: line_num as u64 + 1,
                    line: line.to_string(),
                    byte_offset: 0,
                });
            }
        }

        Ok(results)
    }

    if path.is_file() {
        results = search_file(path, &re).await?;
    } else if path.is_dir() {
        let mut join_set = JoinSet::new();

        let mut entries = tokio::fs::read_dir(path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let entry_path = entry.path();
            if entry_path.is_file() {
                let re = re.clone();
                join_set.spawn(async move {
                    search_file(&entry_path, &re).await
                });
            }

            if results.len() >= max_results {
                break;
            }
        }

        while let Some(task_result) = join_set.join_next().await {
            if let Ok(file_results) = task_result {
                results.extend(file_results?);
                if results.len() >= max_results {
                    break;
                }
            }
        }
    }

    Ok(results)
}
