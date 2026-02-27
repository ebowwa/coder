//! Diff calculation

use crate::DiffHunk;

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
            hunks.push(DiffHunk {
                old_start,
                old_lines: old_count,
                new_start,
                new_lines: new_count,
                content,
            });
        }
    }

    Ok(hunks)
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
}
