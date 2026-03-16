//! Utility functions for CRM native module
//!
//! Common utilities used across the module.

use std::collections::HashMap;

/// Convert a Unix timestamp to ISO 8601 string
pub fn timestamp_to_iso(timestamp: i64) -> String {
    chrono::DateTime::from_timestamp(timestamp, 0)
        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

/// Parse an ISO 8601 string to Unix timestamp
pub fn iso_to_timestamp(iso: &str) -> Option<i64> {
    chrono::DateTime::parse_from_rfc3339(iso)
        .ok()
        .map(|dt| dt.timestamp())
}

/// Calculate Levenshtein distance between two strings
pub fn levenshtein_distance(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();

    let a_len = a_chars.len();
    let b_len = b_chars.len();

    if a_len == 0 {
        return b_len;
    }
    if b_len == 0 {
        return a_len;
    }

    let mut matrix = vec![vec![0; b_len + 1]; a_len + 1];

    // Initialize first row and column
    for i in 0..=a_len {
        matrix[i][0] = i;
    }
    for j in 0..=b_len {
        matrix[0][j] = j;
    }

    for i in 1..=a_len {
        for j in 1..=b_len {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }

    matrix[a_len][b_len]
}

/// Calculate similarity score (0-100) based on Levenshtein distance
pub fn string_similarity(a: &str, b: &str) -> u8 {
    if a.is_empty() && b.is_empty() {
        return 100;
    }

    let max_len = a.len().max(b.len());
    if max_len == 0 {
        return 100;
    }

    let distance = levenshtein_distance(a, b);
    let similarity = 100.0 - ((distance as f64 / max_len as f64) * 100.0);

    similarity.max(0.0).min(100.0) as u8
}

/// Normalize a string for comparison (lowercase, trim, remove extra whitespace)
pub fn normalize_string(s: &str) -> String {
    s.to_lowercase()
        .trim()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Extract words from a string
pub fn extract_words(s: &str) -> Vec<String> {
    s.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(|w| w.to_string())
        .collect()
}

/// Calculate word overlap between two strings
pub fn word_overlap(a: &str, b: &str) -> f32 {
    let words_a: std::collections::HashSet<String> = extract_words(a).into_iter().collect();
    let words_b: std::collections::HashSet<String> = extract_words(b).into_iter().collect();

    if words_a.is_empty() && words_b.is_empty() {
        return 1.0;
    }

    let intersection = words_a.intersection(&words_b).count();
    let union = words_a.union(&words_b).count();

    if union == 0 {
        return 0.0;
    }

    intersection as f32 / union as f32
}

/// Generate a UUID v4
pub fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Validate UUID format
pub fn is_valid_uuid(s: &str) -> bool {
    uuid::Uuid::parse_str(s).is_ok()
}

/// Hash a string using xxHash3
pub fn hash_string(s: &str) -> u64 {
    xxhash_rust::xxh3::xxh3_64(s.as_bytes())
}

/// Hash bytes using xxHash3
pub fn hash_bytes(bytes: &[u8]) -> u64 {
    xxhash_rust::xxh3::xxh3_64(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_levenshtein_distance() {
        assert_eq!(levenshtein_distance("hello", "hello"), 0);
        assert_eq!(levenshtein_distance("hello", "hallo"), 1);
        assert_eq!(levenshtein_distance("hello", ""), 5);
        assert_eq!(levenshtein_distance("", "hello"), 5);
    }

    #[test]
    fn test_string_similarity() {
        assert_eq!(string_similarity("hello", "hello"), 100);
        assert!(string_similarity("hello", "hallo") > 70);
        assert_eq!(string_similarity("", ""), 100);
    }

    #[test]
    fn test_normalize_string() {
        assert_eq!(normalize_string("  Hello  World  "), "hello world");
        assert_eq!(normalize_string("TEST"), "test");
    }

    #[test]
    fn test_word_overlap() {
        assert_eq!(word_overlap("hello world", "hello world"), 1.0);
        assert!(word_overlap("hello world", "hello there") > 0.0);
        assert!(word_overlap("hello world", "goodbye there") < 0.5);
    }

    #[test]
    fn test_is_valid_uuid() {
        assert!(is_valid_uuid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!is_valid_uuid("not-a-uuid"));
    }
}
