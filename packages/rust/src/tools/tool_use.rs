// Tool usage analysis

use std::collections::{HashMap, HashSet};

/// Count occurrences of each tool in messages
pub fn count_tool_uses(messages: &[serde_json::Value]) -> HashMap<String, usize> {
    let mut counts = HashMap::new();

    for msg in messages {
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            *counts.entry(name.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }

    counts
}

/// Extract unique tool names in order of first use
pub fn extract_tool_sequence(messages: &[serde_json::Value]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut sequence = Vec::new();

    for msg in messages {
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            if seen.insert(name.to_string()) {
                                sequence.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    sequence
}

/// Calculate tool pair co-occurrence
pub fn calculate_tool_pairs(messages: &[serde_json::Value]) -> HashMap<(String, String), usize> {
    let mut pairs: HashMap<(String, String), usize> = HashMap::new();
    let mut last_tool: Option<String> = None;

    for msg in messages {
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            let name = name.to_string();

                            if let Some(last) = last_tool {
                                *pairs.entry((last, name.clone())).or_insert(0) += 1;
                            }

                            last_tool = Some(name);
                        }
                    }
                }
            }
        }
    }

    pairs
}

#[napi(object)]
pub struct ToolUseCount {
    pub tool_name: String,
    pub count: u32,
}

#[napi(object)]
pub struct ToolPair {
    pub tool1: String,
    pub tool2: String,
    pub count: u32,
}

#[napi(object)]
pub struct ToolAnalysis {
    pub counts: Vec<ToolUseCount>,
    pub sequence: Vec<String>,
    pub pairs: Vec<ToolPair>,
    pub total_uses: u32,
}

/// Analyze all tool usage patterns
pub fn analyze_tool_usage(messages: &[serde_json::Value]) -> ToolAnalysis {
    let counts = count_tool_uses(messages);
    let sequence = extract_tool_sequence(messages);
    let pairs = calculate_tool_pairs(messages);

    let total_uses: u32 = counts.values().sum::<usize>().try_into().unwrap();

    let counts_vec: Vec<ToolUseCount> = counts
        .into_iter()
        .map(|(tool_name, count)| ToolUseCount { tool_name, count: count.try_into().unwrap() })
        .collect();

    let pairs_vec: Vec<ToolPair> = pairs
        .into_iter()
        .map(|((tool1, tool2), count)| ToolPair {
            tool1,
            tool2,
            count: count.try_into().unwrap(),
        })
        .collect();

    ToolAnalysis {
        counts: counts_vec,
        sequence,
        pairs: pairs_vec,
        total_uses,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_count_tool_uses() {
        let messages = vec![json!({
            "content": [
                {"type": "tool_use", "name": "Read", "input": {}},
                {"type": "tool_use", "name": "Edit", "input": {}},
                {"type": "tool_use", "name": "Read", "input": {}},
            ]
        })];

        let counts = count_tool_uses(&messages);
        assert_eq!(counts.get("Read"), Some(&2));
        assert_eq!(counts.get("Edit"), Some(&1));
    }

    #[test]
    fn test_extract_tool_sequence() {
        let messages = vec![
            json!({
                "content": [
                    {"type": "tool_use", "name": "Read", "input": {}},
                    {"type": "tool_use", "name": "Edit", "input": {}},
                ]
            }),
            json!({
                "content": [
                    {"type": "tool_use", "name": "Read", "input": {}},
                ]
            }),
        ];

        let sequence = extract_tool_sequence(&messages);
        assert_eq!(sequence, vec!["Read", "Edit"]);
    }
}
