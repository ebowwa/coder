// Pattern recognition for tool usage analysis
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct ToolUse {
    pub tool_name: String,
    pub target: String,
    pub index: usize,
}

#[derive(Debug, Clone)]
pub struct Pattern {
    pub tools: Vec<String>,
    pub support: usize,
    pub confidence: f64,
}

/// Parse messages to extract tool uses
pub fn parse_tool_uses(messages: &[serde_json::Value]) -> Vec<ToolUse> {
    let mut uses = Vec::new();
    let mut index = 0;

    for msg in messages {
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    // Check for tool_use blocks
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            if let Some(input) = block.get("input") {
                                let target = extract_target(input);
                                uses.push(ToolUse {
                                    tool_name: name.to_string(),
                                    target,
                                    index,
                                });
                                index += 1;
                            }
                        }
                    }
                    // Check for tool_result blocks
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                        index += 1;
                    }
                }
            }
        }
    }

    uses
}

/// Extract target from tool input
fn extract_target(input: &serde_json::Value) -> String {
    // Common target fields
    for key in ["file_path", "path", "target", "url", "query"] {
        if let Some(value) = input.get(key).and_then(|v| v.as_str()) {
            return value.to_string();
        }
    }

    // Fallback to string representation
    input.to_string()
}

/// Count occurrences of each tool
pub fn count_tool_usage(uses: &[ToolUse]) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for use_ in uses {
        *counts.entry(use_.tool_name.clone()).or_insert(0) += 1;
    }
    counts
}

/// Find sequential patterns (e.g., "Read followed by Edit")
pub fn find_sequential_patterns(uses: &[ToolUse], min_support: usize) -> Vec<Pattern> {
    if uses.len() < 2 {
        return Vec::new();
    }

    let mut patterns: HashMap<Vec<String>, usize> = HashMap::new();

    // Extract 2-sequences
    for window in uses.windows(2) {
        let seq = vec![window[0].tool_name.clone(), window[1].tool_name.clone()];
        *patterns.entry(seq).or_insert(0) += 1;
    }

    // Extract 3-sequences
    for window in uses.windows(3) {
        let seq = vec![
            window[0].tool_name.clone(),
            window[1].tool_name.clone(),
            window[2].tool_name.clone(),
        ];
        *patterns.entry(seq).or_insert(0) += 1;
    }

    let total = uses.len().saturating_sub(1);

    patterns
        .into_iter()
        .filter(|(_, count)| *count >= min_support)
        .map(|(tools, support)| Pattern {
            tools,
            support,
            confidence: support as f64 / total as f64,
        })
        .collect()
}

/// Find common tool-target combinations
pub fn find_tool_patterns(uses: &[ToolUse]) -> HashMap<String, HashSet<String>> {
    let mut patterns: HashMap<String, HashSet<String>> = HashMap::new();

    for use_ in uses {
        patterns
            .entry(use_.tool_name.clone())
            .or_insert_with(HashSet::new)
            .insert(use_.target.clone());
    }

    patterns
}

/// Detect if a tool is used repetitively (potential issue)
pub fn detect_repetitive_use(uses: &[ToolUse], threshold: usize) -> Vec<(String, usize)> {
    let mut tool_counts: HashMap<String, usize> = HashMap::new();

    for use_ in uses {
        *tool_counts.entry(use_.tool_name.clone()).or_insert(0) += 1;
    }

    tool_counts
        .into_iter()
        .filter(|(_, count)| *count > threshold)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_tool_uses() {
        let messages = vec![json!({
            "content": [{
                "type": "tool_use",
                "name": "Read",
                "input": {"file_path": "/path/to/file.txt"}
            }]
        })];

        let uses = parse_tool_uses(&messages);
        assert_eq!(uses.len(), 1);
        assert_eq!(uses[0].tool_name, "Read");
        assert_eq!(uses[0].target, "/path/to/file.txt");
    }

    #[test]
    fn test_sequential_patterns() {
        let uses = vec![
            ToolUse {
                tool_name: "Read".to_string(),
                target: "a.txt".to_string(),
                index: 0,
            },
            ToolUse {
                tool_name: "Edit".to_string(),
                target: "a.txt".to_string(),
                index: 1,
            },
            ToolUse {
                tool_name: "Read".to_string(),
                target: "b.txt".to_string(),
                index: 2,
            },
            ToolUse {
                tool_name: "Edit".to_string(),
                target: "b.txt".to_string(),
                index: 3,
            },
        ];

        let patterns = find_sequential_patterns(&uses, 2);
        assert!(patterns.iter().any(|p| p.tools == vec!["Read", "Edit"]));
    }
}
