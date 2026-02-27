//! Token counting (approximate)
//!
//! Uses a simple heuristic-based approach for fast token estimation.
//! For exact counts, use the tiktoken library.

/// Count tokens in text using approximate heuristic
///
/// This uses a simple algorithm based on:
/// - Word boundaries (spaces, punctuation)
/// - Average token length (4 characters)
/// - Special handling for code vs prose
pub fn count_tokens(text: &str) -> u32 {
    if text.is_empty() {
        return 0;
    }

    let bytes = text.len();
    let _chars = text.chars().count();

    // Count whitespace
    let whitespace = text.chars().filter(|c| c.is_whitespace()).count();

    // Count punctuation
    let punctuation = text
        .chars()
        .filter(|c| c.is_ascii_punctuation())
        .count();

    // Count newlines
    let _newlines = text.chars().filter(|c| *c == '\n').count();

    // Detect if this is code (heuristic)
    let is_code = text.contains('{')
        || text.contains('}')
        || text.contains(';')
        || text.contains("fn ")
        || text.contains("function")
        || text.contains("const ")
        || text.contains("let ")
        || text.contains("import ");

    // Base estimate: ~4 characters per token
    let base_estimate = (bytes as f64 / 4.0) as u32;

    // Adjust for code (typically more tokens)
    let code_adjustment = if is_code {
        (bytes as f64 / 10.0) as u32
    } else {
        0
    };

    // Adjust for whitespace (tokens are often split on whitespace)
    let whitespace_adjustment = (whitespace as f64 * 0.2) as u32;

    // Adjust for punctuation
    let punctuation_adjustment = (punctuation as f64 * 0.5) as u32;

    // Combine estimates
    let estimate = base_estimate
        + code_adjustment
        + whitespace_adjustment
        + punctuation_adjustment;

    // Minimum of 1 token
    estimate.max(1)
}

/// Count tokens in code specifically
#[allow(dead_code)]
pub fn count_code_tokens(code: &str) -> u32 {
    if code.is_empty() {
        return 0;
    }

    // For code, count:
    // - Identifiers
    // - Keywords
    // - Operators
    // - Punctuation
    // - Whitespace

    let mut tokens = 0u32;
    let mut in_identifier = false;
    let mut in_string = false;
    let mut string_delim = ' ';

    for c in code.chars() {
        if in_string {
            if c == string_delim || c == '\n' {
                in_string = false;
                tokens += 1;
            }
            continue;
        }

        match c {
            // String delimiters
            '"' | '\'' | '`' => {
                in_string = true;
                string_delim = c;
                tokens += 1;
            }
            // Identifiers
            'a'..='z' | 'A'..='Z' | '_' | '0'..='9' => {
                if !in_identifier {
                    in_identifier = true;
                    tokens += 1;
                }
            }
            // Whitespace
            ' ' | '\t' | '\n' | '\r' => {
                in_identifier = false;
            }
            // Operators and punctuation
            _ => {
                in_identifier = false;
                tokens += 1;
            }
        }
    }

    tokens.max(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_tokens_simple() {
        assert_eq!(count_tokens("Hello world"), 2);
        assert_eq!(count_tokens("The quick brown fox"), 4);
    }

    #[test]
    fn test_count_tokens_empty() {
        assert_eq!(count_tokens(""), 0);
    }

    #[test]
    fn test_count_code_tokens() {
        let code = r#"function hello() { return "world"; }"#;
        let count = count_code_tokens(code);
        assert!(count > 5);
    }
}
