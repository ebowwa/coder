// Context compaction utilities

use std::collections::HashMap;

/// Calculate estimated token count for text
pub fn estimate_tokens(text: &str) -> usize {
    // Rough approximation: ~4 characters per token
    // This varies by language but is a reasonable baseline
    text.len() / 4
}

/// Compact messages by summarizing old tool results
pub fn compact_tool_results(
    messages: &[serde_json::Value],
    max_age: usize,
    max_results: usize,
) -> Vec<serde_json::Value> {
    let mut result = Vec::new();
    let mut tool_result_count = 0;

    for msg in messages {
        // Keep user/assistant messages as-is
        let is_tool_result = msg
            .get("role")
            .and_then(|r| r.as_str())
            == Some("user");

        let has_tool_result = msg
            .get("content")
            .and_then(|c| c.as_array())
            .map(|arr| {
                arr.iter().any(|block| {
                    block.get("type").and_then(|t| t.as_str()) == Some("tool_result")
                })
            })
            .unwrap_or(false);

        if !has_tool_result {
            result.push(msg.clone());
        } else {
            tool_result_count += 1;

            // Keep recent tool results
            if tool_result_count <= max_results {
                // Check if we should summarize based on content size
                if let Some(content) = msg.get("content") {
                    if let Some(content_array) = content.as_array() {
                        let mut new_content = Vec::new();

                        for block in content_array {
                            if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                                if let Some(result_text) = block.get("result") {
                                    if let Some(result_str) = result_text.as_str() {
                                        // Summarize large results
                                        if result_str.len() > 10_000 {
                                            let summary = format!(
                                                "[Content compacted: {} chars, {} estimated tokens]",
                                                result_str.len(),
                                                estimate_tokens(result_str)
                                            );
                                            let mut summarized = block.clone();
                                            summarized["result"] = serde_json::json!(summary);
                                            summarized["is_compacted"] = serde_json::json!(true);
                                            new_content.push(summarized);
                                        } else {
                                            new_content.push(block.clone());
                                        }
                                    } else {
                                        new_content.push(block.clone());
                                    }
                                } else {
                                    new_content.push(block.clone());
                                }
                            } else {
                                new_content.push(block.clone());
                            }
                        }

                        let mut new_msg = msg.clone();
                        new_msg["content"] = serde_json::json!(new_content);
                        result.push(new_msg);
                    }
                }
            }
            // Skip old tool results beyond max_results
        }
    }

    result
}

/// Calculate context window usage statistics
pub fn calculate_context_stats(messages: &[serde_json::Value]) -> ContextStats {
    let mut total_tokens = 0;
    let mut tool_result_tokens = 0;
    let mut user_tokens = 0;
    let mut assistant_tokens = 0;

    for msg in messages {
        let msg_str = serde_json::to_string(msg).unwrap_or_default();
        let msg_tokens = estimate_tokens(&msg_str);

        total_tokens += msg_tokens;

        if let Some(role) = msg.get("role").and_then(|r| r.as_str()) {
            match role {
                "user" => user_tokens += msg_tokens,
                "assistant" => assistant_tokens += msg_tokens,
                _ => {}
            }
        }

        // Count tool result content separately
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                for block in content_array {
                    if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                        if let Some(result) = block.get("result") {
                            let result_str = result.to_string();
                            tool_result_tokens += estimate_tokens(&result_str);
                        }
                    }
                }
            }
        }
    }

    ContextStats {
        total_tokens,
        user_tokens,
        assistant_tokens,
        tool_result_tokens,
        message_count: messages.len(),
    }
}

#[napi(object)]
pub struct ContextStats {
    pub total_tokens: usize,
    pub user_tokens: usize,
    pub assistant_tokens: usize,
    pub tool_result_tokens: usize,
    pub message_count: usize,
}

/// Remove duplicate adjacent messages
pub fn deduplicate_messages(messages: &[serde_json::Value]) -> Vec<serde_json::Value> {
    let mut result = Vec::new();
    let mut last_content: Option<String> = None;

    for msg in messages {
        let content = msg.to_string();

        if last_content.as_ref() != Some(&content) {
            result.push(msg.clone());
            last_content = Some(content);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_estimate_tokens() {
        assert_eq!(estimate_tokens("hello world"), 11 / 4);
        assert_eq!(estimate_tokens(&"a".repeat(400)), 100);
    }

    #[test]
    fn test_context_stats() {
        let messages = vec![
            json!({"role": "user", "content": "hello"}),
            json!({"role": "assistant", "content": [{"type": "tool_result", "result": "result"}]}),
        ];

        let stats = calculate_context_stats(&messages);
        assert!(stats.total_tokens > 0);
        assert_eq!(stats.message_count, 2);
    }

    #[test]
    fn test_deduplicate() {
        let msg = json!({"role": "user", "content": "test"});
        let messages = vec![msg.clone(), msg.clone(), msg];

        let deduped = deduplicate_messages(&messages);
        assert_eq!(deduped.len(), 1);
    }
}
