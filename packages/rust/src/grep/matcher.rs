//! Pattern matching logic for grep

use regex::{Regex, RegexBuilder};
use crate::grep::types::SearchConfig;

/// Result of a single match
#[derive(Debug, Clone)]
pub struct MatchResult {
    /// 1-based line number
    pub line_number: u64,
    /// 1-based column (byte offset in line)
    pub column: u32,
    /// Byte offset from start of file
    pub byte_offset: u64,
    /// Length of the match in bytes
    pub match_length: u32,
    /// The matched text
    pub matched_text: String,
}

/// Pattern matcher supporting regex, literal, and whole-word modes
#[derive(Debug, Clone)]
pub struct PatternMatcher {
    regex: Regex,
    invert: bool,
}

impl PatternMatcher {
    /// Create a new pattern matcher
    pub fn new(pattern: &str, config: &SearchConfig) -> anyhow::Result<Self> {
        let final_pattern = if config.whole_word && !config.literal {
            // Wrap in word boundaries for regex mode
            format!(r"\b{}\b", pattern)
        } else {
            pattern.to_string()
        };

        let regex = if config.literal {
            // Escape all regex metacharacters for literal matching
            let escaped = regex::escape(&final_pattern);
            RegexBuilder::new(&escaped)
                .case_insensitive(config.case_insensitive)
                .multi_line(config.multiline)
                .build()?
        } else {
            RegexBuilder::new(&final_pattern)
                .case_insensitive(config.case_insensitive)
                .multi_line(config.multiline)
                .build()?
        };

        Ok(Self {
            regex,
            invert: config.invert,
        })
    }

    /// Check if a line matches the pattern
    #[inline]
    pub fn is_match(&self, line: &str) -> bool {
        let has_match = self.regex.is_match(line);
        if self.invert {
            !has_match
        } else {
            has_match
        }
    }

    /// Find all matches in a line
    pub fn find_matches(&self, line: &str) -> Vec<(usize, usize)> {
        self.regex
            .find_iter(line)
            .map(|m| (m.start(), m.end()))
            .collect()
    }

    /// Search content and return all match results
    pub fn search_content(&self, content: &str) -> Vec<MatchResult> {
        let mut results = Vec::new();
        let mut byte_offset = 0u64;

        for (line_num, line) in content.lines().enumerate() {
            let line_byte_len = line.len() as u64 + 1; // +1 for newline

            let matches = self.find_matches(line);

            if self.invert {
                // In invert mode, return the whole line if no matches
                if matches.is_empty() {
                    results.push(MatchResult {
                        line_number: line_num as u64 + 1,
                        column: 1,
                        byte_offset,
                        match_length: line.len() as u32,
                        matched_text: line.to_string(),
                    });
                }
            } else {
                // Normal mode: return each match
                for (start, end) in matches {
                    // Calculate UTF-8 aware column position
                    let column = line.char_indices()
                        .take_while(|(byte_idx, _)| *byte_idx < start)
                        .count() + 1;

                    results.push(MatchResult {
                        line_number: line_num as u64 + 1,
                        column: column as u32,
                        byte_offset: byte_offset + start as u64,
                        match_length: (end - start) as u32,
                        matched_text: line[start..end].to_string(),
                    });
                }
            }

            byte_offset += line_byte_len;
        }

        results
    }

    /// Search a single line and return if it matches
    pub fn search_line(&self, line: &str, line_number: u64, byte_offset: u64) -> Option<MatchResult> {
        if self.is_match(line) {
            // Find first match for position info
            let first_match = self.regex.find(line);

            let (column, match_length, matched_text) = if let Some(m) = first_match {
                let col = line.char_indices()
                    .take_while(|(byte_idx, _)| *byte_idx < m.start())
                    .count() + 1;
                (col as u32, (m.end() - m.start()) as u32, m.as_str().to_string())
            } else {
                // Invert mode - whole line
                (1, line.len() as u32, line.to_string())
            };

            Some(MatchResult {
                line_number,
                column,
                byte_offset,
                match_length,
                matched_text,
            })
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_config() -> SearchConfig {
        SearchConfig::default()
    }

    #[test]
    fn test_literal_match() {
        let mut config = default_config();
        config.literal = true;

        // Literal mode should match the pattern as a literal string anywhere
        let matcher = PatternMatcher::new("fn main", &config).unwrap();
        assert!(matcher.is_match("fn main() {}"));
        // "fn main" is a substring of "fn main_function" so it should match
        assert!(matcher.is_match("fn main_function() {}"));

        // Test that regex special chars are treated literally
        let matcher = PatternMatcher::new(r"fn \w+", &config).unwrap();
        // Should NOT match "fn main" because it's looking for literal "fn \w+"
        assert!(!matcher.is_match("fn main() {}"));
        // Should match the literal string "fn \w+"
        assert!(matcher.is_match(r"fn \w+ here"));
    }

    #[test]
    fn test_regex_match() {
        let config = default_config();
        let matcher = PatternMatcher::new(r"fn \w+", &config).unwrap();
        assert!(matcher.is_match("fn main() {}"));
        assert!(matcher.is_match("fn helper() {}"));
    }

    #[test]
    fn test_case_insensitive() {
        let mut config = default_config();
        config.case_insensitive = true;

        let matcher = PatternMatcher::new("HELLO", &config).unwrap();
        assert!(matcher.is_match("hello world"));
        assert!(matcher.is_match("HELLO WORLD"));
    }

    #[test]
    fn test_whole_word() {
        let mut config = default_config();
        config.whole_word = true;

        let matcher = PatternMatcher::new("main", &config).unwrap();
        assert!(matcher.is_match("fn main()"));
        assert!(!matcher.is_match("fn main_function()"));
    }

    #[test]
    fn test_invert_match() {
        let mut config = default_config();
        config.invert = true;

        let matcher = PatternMatcher::new("TODO", &config).unwrap();
        assert!(!matcher.is_match("// TODO: fix this"));
        assert!(matcher.is_match("// This is fine"));
    }

    #[test]
    fn test_find_matches() {
        let config = default_config();
        let matcher = PatternMatcher::new(r"\d+", &config).unwrap();

        let matches = matcher.find_matches("abc 123 def 456 ghi");
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0], (4, 7));
        assert_eq!(matches[1], (12, 15));
    }
}
