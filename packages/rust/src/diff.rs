//! Diff calculation and highlighting

use crate::DiffHunk;

/// ANSI color codes
pub const RESET: &str = "\x1b[0m";
pub const GREEN: &str = "\x1b[38;2;163;190;140m";      // Additions
pub const RED: &str = "\x1b[38;2;191;97;106m";         // Deletions
pub const CYAN: &str = "\x1b[38;2;143;161;179m";       // Line numbers/filenames
pub const DIM: &str = "\x1b[38;2;108;153;139m";        // Hunk headers, context
pub const BOLD: &str = "\x1b[1m";

/// Highlighted diff result
#[derive(Debug, Clone)]
pub struct HighlightedDiff {
    pub output: String,
    pub additions: u32,
    pub deletions: u32,
    pub hunks: u32,
}

/// Calculate diff hunks between two strings
pub fn calculate_diff(old_text: &str, new_text: &str) -> anyhow::Result<Vec<DiffHunk>> {
    let old_lines: Vec<&str> = old_text.lines().collect();
    let new_lines: Vec<&str> = new_text.lines().collect();

    // Simple LCS-based diff
    let lcs = longest_common_subsequence(&old_lines, &new_lines);

    // Build diff hunks
    let mut hunks = Vec::new();
    let mut old_idx = 0;
    let mut new_idx = 0;
    let mut lcs_idx = 0;

    while old_idx < old_lines.len() || new_idx < new_lines.len() {
        // Skip matching lines
        while lcs_idx < lcs.len()
            && old_idx < old_lines.len()
            && new_idx < new_lines.len()
            && old_lines[old_idx] == lcs[lcs_idx]
            && new_lines[new_idx] == lcs[lcs_idx]
        {
            old_idx += 1;
            new_idx += 1;
            lcs_idx += 1;
        }

        // Collect diff
        let old_start = (old_idx + 1) as u32;
        let new_start = (new_idx + 1) as u32;
        let mut old_count = 0u32;
        let mut new_count = 0u32;
        let mut content = String::new();

        // Collect removed lines
        while old_idx < old_lines.len()
            && (lcs_idx >= lcs.len() || old_lines[old_idx] != lcs[lcs_idx])
        {
            content.push_str(&format!("-{}\n", old_lines[old_idx]));
            old_idx += 1;
            old_count += 1;
        }

        // Collect added lines
        while new_idx < new_lines.len()
            && (lcs_idx >= lcs.len() || new_lines[new_idx] != lcs[lcs_idx])
        {
            content.push_str(&format!("+{}\n", new_lines[new_idx]));
            new_idx += 1;
            new_count += 1;
        }

        if old_count > 0 || new_count > 0 {
            // Prepend hunk header to content for LLM context
            let header = format!("@@ -{},{} +{},{} @@\n", old_start, old_count, new_start, new_count);
            hunks.push(DiffHunk {
                old_start,
                old_lines: old_count,
                new_start,
                new_lines: new_count,
                content: header + &content,
            });
        }
    }

    Ok(hunks)
}

/// Calculate and highlight a unified diff with ANSI colors
pub fn highlight_diff(
    old_text: &str,
    new_text: &str,
    file_path: Option<&str>,
    context_lines: usize,
) -> HighlightedDiff {
    let old_lines: Vec<&str> = old_text.lines().collect();
    let new_lines: Vec<&str> = new_text.lines().collect();

    let mut output = String::new();
    let mut additions = 0u32;
    let mut deletions = 0u32;
    let mut hunks = 0u32;

    // File header
    if let Some(path) = file_path {
        output.push_str(&format!("{}{}{}\n", CYAN, path, RESET));
    }

    // Simple LCS-based diff
    let lcs = longest_common_subsequence(&old_lines, &new_lines);

    let mut old_idx = 0usize;
    let mut new_idx = 0usize;
    let mut lcs_idx = 0usize;

    // Collect hunks with context
    let mut pending_context: Vec<(usize, &str)> = Vec::new(); // (old_idx, line)

    while old_idx < old_lines.len() || new_idx < new_lines.len() {
        // Skip matching lines, tracking context
        while lcs_idx < lcs.len()
            && old_idx < old_lines.len()
            && new_idx < new_lines.len()
            && old_lines[old_idx] == lcs[lcs_idx]
            && new_lines[new_idx] == lcs[lcs_idx]
        {
            // Track context lines
            pending_context.push((old_idx, old_lines[old_idx]));
            if pending_context.len() > context_lines {
                pending_context.remove(0);
            }
            old_idx += 1;
            new_idx += 1;
            lcs_idx += 1;
        }

        // Collect diff
        let old_start = (old_idx + 1 - pending_context.len().min(context_lines)) as u32;
        let new_start = (new_idx + 1 - pending_context.len().min(context_lines)) as u32;
        let mut old_count = 0u32;
        let mut new_count = 0u32;
        let mut hunk_content = String::new();

        // Add context lines
        for (_, line) in &pending_context {
            hunk_content.push_str(&format!("{}  {}{}\n", DIM, line, RESET));
            old_count += 1;
            new_count += 1;
        }
        pending_context.clear();

        // Collect removed lines
        while old_idx < old_lines.len()
            && (lcs_idx >= lcs.len() || old_lines[old_idx] != lcs[lcs_idx])
        {
            deletions += 1;
            hunk_content.push_str(&format!("{}-{}{}\n", RED, old_lines[old_idx], RESET));
            old_idx += 1;
            old_count += 1;
        }

        // Collect added lines
        while new_idx < new_lines.len()
            && (lcs_idx >= lcs.len() || new_lines[new_idx] != lcs[lcs_idx])
        {
            additions += 1;
            hunk_content.push_str(&format!("{}+{}{}\n", GREEN, new_lines[new_idx], RESET));
            new_idx += 1;
            new_count += 1;
        }

        // Add trailing context
        let mut trailing = 0usize;
        while trailing < context_lines
            && lcs_idx < lcs.len()
            && old_idx < old_lines.len()
            && new_idx < new_lines.len()
            && old_lines[old_idx] == lcs[lcs_idx]
            && new_lines[new_idx] == lcs[lcs_idx]
        {
            hunk_content.push_str(&format!("{}  {}{}\n", DIM, old_lines[old_idx], RESET));
            pending_context.push((old_idx, old_lines[old_idx]));
            old_idx += 1;
            new_idx += 1;
            lcs_idx += 1;
            trailing += 1;
            old_count += 1;
            new_count += 1;
        }

        // Remove from pending_context what we just used as trailing
        if trailing > 0 {
            pending_context.drain(..trailing.min(pending_context.len()));
        }

        if old_count > 0 || new_count > 0 {
            hunks += 1;
            // Hunk header
            output.push_str(&format!(
                "{}@@ -{},{} +{},{} @@{}\n",
                DIM, old_start, old_count, new_start, new_count, RESET
            ));
            output.push_str(&hunk_content);
        }
    }

    HighlightedDiff {
        output,
        additions,
        deletions,
        hunks,
    }
}

/// Compute longest common subsequence of two string slices
fn longest_common_subsequence<'a>(a: &[&'a str], b: &[&'a str]) -> Vec<&'a str> {
    let m = a.len();
    let n = b.len();

    // DP table
    let mut dp = vec![vec![0; n + 1]; m + 1];

    // Fill DP table
    for i in 1..=m {
        for j in 1..=n {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    let mut lcs = Vec::new();
    let mut i = m;
    let mut j = n;

    while i > 0 && j > 0 {
        if a[i - 1] == b[j - 1] {
            lcs.push(a[i - 1]);
            i -= 1;
            j -= 1;
        } else if dp[i - 1][j] > dp[i][j - 1] {
            i -= 1;
        } else {
            j -= 1;
        }
    }

    lcs.reverse();
    lcs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_diff_simple() {
        let old = "line1\nline2\nline3";
        let new = "line1\nline2modified\nline3";
        let hunks = calculate_diff(old, new).unwrap();
        assert_eq!(hunks.len(), 1);
    }

    #[test]
    fn test_diff_identical() {
        let text = "same\ncontent";
        let hunks = calculate_diff(text, text).unwrap();
        assert!(hunks.is_empty());
    }

    #[test]
    fn test_highlight_diff() {
        let old = "function hello() {\n  return 'world';\n}";
        let new = "function hello() {\n  return 'hello';\n}";
        let result = highlight_diff(old, new, Some("test.ts"), 3);
        assert!(result.output.contains("-"));
        assert!(result.output.contains("+"));
        assert!(result.deletions > 0);
        assert!(result.additions > 0);
    }
}
