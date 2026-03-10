//! Content compaction for context management
//!
//! Strategies for reducing content size while preserving key information.

/// Compact content to fit within token limit
pub fn compact_content(
    content: &str,
    max_tokens: u32,
    strategy: Option<&str>,
) -> anyhow::Result<String> {
    let current_tokens = estimate_tokens(content);

    if current_tokens <= max_tokens {
        return Ok(content.to_string());
    }

    let strategy = strategy.unwrap_or("truncate");

    match strategy {
        "truncate" => truncate_compact(content, max_tokens),
        "summarize" => summarize_compact(content, max_tokens),
        "extract" => extract_compact(content, max_tokens),
        _ => truncate_compact(content, max_tokens),
    }
}

/// Truncate content with ellipsis
fn truncate_compact(content: &str, max_tokens: u32) -> anyhow::Result<String> {
    let chars_per_token = 4;
    let max_chars = (max_tokens * chars_per_token) as usize;

    if content.len() <= max_chars {
        return Ok(content.to_string());
    }

    // Try to truncate at a sentence boundary
    let truncate_point = find_truncate_point(content, max_chars);

    Ok(format!(
        "{}\n\n... [content truncated: {} tokens remaining]\n\n...{}\n\n[content continues]\n",
        &content[..truncate_point],
        max_tokens / 2,
        &content[content.len().saturating_sub(max_chars / 2)..]
    ))
}

/// Summarize by extracting key sections
fn summarize_compact(content: &str, max_tokens: u32) -> anyhow::Result<String> {
    let lines: Vec<&str> = content.lines().collect();
    let chars_per_token = 4;
    let max_chars = (max_tokens * chars_per_token) as usize;

    // Extract:
    // 1. First N lines (context)
    // 2. Important lines (headers, declarations)
    // 3. Last N lines (recent context)

    let first_count = 20.min(lines.len() / 4);
    let last_count = 20.min(lines.len() / 4);

    let mut result = String::new();
    let mut current_chars = 0;

    // Add first lines
    result.push_str("=== BEGINNING ===\n");
    for line in lines.iter().take(first_count) {
        if current_chars + line.len() > max_chars / 2 {
            break;
        }
        result.push_str(line);
        result.push('\n');
        current_chars += line.len() + 1;
    }

    // Add important lines
    result.push_str("\n=== KEY SECTIONS ===\n");
    for line in lines
        .iter()
        .skip(first_count)
        .take(lines.len() - first_count - last_count)
    {
        if is_important_line(line) && current_chars + line.len() < max_chars * 3 / 4 {
            result.push_str(line);
            result.push('\n');
            current_chars += line.len() + 1;
        }
    }

    // Add last lines
    result.push_str("\n=== END ===\n");
    for line in lines.iter().rev().take(last_count).rev() {
        if current_chars + line.len() < max_chars {
            result.push_str(line);
            result.push('\n');
            current_chars += line.len() + 1;
        }
    }

    Ok(result)
}

/// Extract structure (headings, declarations, etc.)
fn extract_compact(content: &str, max_tokens: u32) -> anyhow::Result<String> {
    let lines: Vec<&str> = content.lines().collect();
    let chars_per_token = 4;
    let max_chars = (max_tokens * chars_per_token) as usize;

    let mut result = String::new();
    let mut current_chars = 0;
    let mut in_code_block = false;

    for line in &lines {
        // Track code blocks
        if line.trim().starts_with("```") {
            in_code_block = !in_code_block;
        }

        // Include important lines
        if is_important_line(line) || is_section_header(line) {
            if current_chars + line.len() < max_chars {
                result.push_str(line);
                result.push('\n');
                current_chars += line.len() + 1;
            }
        }
    }

    if result.is_empty() {
        // Fallback to truncate
        truncate_compact(content, max_tokens)
    } else {
        Ok(result)
    }
}

/// Check if a line is important
fn is_important_line(line: &str) -> bool {
    let trimmed = line.trim();

    // Code structure
    trimmed.starts_with("function ")
        || trimmed.starts_with("const ")
        || trimmed.starts_with("let ")
        || trimmed.starts_with("class ")
        || trimmed.starts_with("interface ")
        || trimmed.starts_with("type ")
        || trimmed.starts_with("export ")
        || trimmed.starts_with("import ")
        || trimmed.starts_with("async ")
        || trimmed.starts_with("pub fn")
        || trimmed.starts_with("fn ")
        || trimmed.starts_with("struct ")
        || trimmed.starts_with("impl ")
        // Comments that might be important
        || trimmed.starts_with("// TODO")
        || trimmed.starts_with("// FIXME")
        || trimmed.starts_with("// NOTE")
        || trimmed.starts_with("// IMPORTANT")
}

/// Check if line is a section header
fn is_section_header(line: &str) -> bool {
    let trimmed = line.trim();

    // Markdown headers
    trimmed.starts_with("# ")
        || trimmed.starts_with("## ")
        || trimmed.starts_with("### ")
        // Other headers
        || trimmed.starts_with("===")
        || trimmed.starts_with("---")
        || trimmed.to_uppercase() == trimmed && trimmed.len() > 3
}

/// Find a good truncation point
/// TODO: LETS REMOVE THIS
fn find_truncate_point(content: &str, max_chars: usize) -> usize {
    if content.len() <= max_chars {
        return content.len();
    }

    // Try to find paragraph break
    let search_start = max_chars.saturating_sub(100);
    let search_end = max_chars.min(content.len());

    for i in search_start..search_end {
        if content.as_bytes().get(i) == Some(&b'\n')
            && content.as_bytes().get(i + 1) == Some(&b'\n')
        {
            return i;
        }
    }

    // Try to find sentence end
    for i in search_start..search_end {
        let c = content.as_bytes().get(i);
        if c == Some(&b'.') || c == Some(&b'!') || c == Some(&b'?') {
            return i + 1;
        }
    }

    // Just truncate at max_chars
    max_chars
}

/// Estimate tokens in content
fn estimate_tokens(content: &str) -> u32 {
    (content.len() / 4) as u32 + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compact_no_change() {
        let content = "Short content";
        let result = compact_content(content, 100, None).unwrap();
        assert_eq!(result, content);
    }

    #[test]
    fn test_compact_truncate() {
        let content = "This is a very long piece of content that needs to be truncated.";
        let result = compact_content(content, 5, Some("truncate")).unwrap();
        assert!(result.contains("[content truncated"));
    }
}
