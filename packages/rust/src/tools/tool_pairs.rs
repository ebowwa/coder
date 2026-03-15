use std::collections::HashMap;
use crate::{ToolPairsResult, ToolPair};

pub fn find_tool_pairs(logs: &[(String, String)], threshold: f64) -> ToolPairsResult {
    let mut pair_counts: HashMap<(String, String), usize> = HashMap::new();
    let mut tool_counts: HashMap<String, usize> = HashMap::new();

    // Count consecutive tool pairs
    for window in logs.windows(2) {
        let (tool1, _target1) = &window[0];
        let (tool2, _target2) = &window[1];

        if tool1 != tool2 {
            let key = (tool1.clone(), tool2.clone());
            *pair_counts.entry(key).or_insert(0) += 1;
        }

        *tool_counts.entry(tool1.clone()).or_insert(0) += 1;
    }

    // Find most similar pairs
    let mut pairs: Vec<ToolPair> = pair_counts
        .into_iter()
        .filter_map(|((tool1, tool2), count)| {
            let total = *tool_counts.get(&tool1).unwrap_or(&1);
            let similarity = count as f64 / total as f64;

            if similarity >= threshold {
                // Find most common targets for each tool
                let targets1: Vec<_> = logs
                    .iter()
                    .filter(|(t, _)| t == &tool1)
                    .map(|(_, target)| target.clone())
                    .collect();

                let targets2: Vec<_> = logs
                    .iter()
                    .filter(|(t, _)| t == &tool2)
                    .map(|(_, target)| target.clone())
                    .collect();

                let target1 = targets1.first().cloned().unwrap_or_default();
                let target2 = targets2.first().cloned().unwrap_or_default();

                Some(ToolPair {
                    tool1,
                    tool2,
                    target1,
                    target2,
                    similarity,
                })
            } else {
                None
            }
        })
        .collect();

    pairs.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

    ToolPairsResult {
        pairs,
        total_calls: logs.len() as u32,
    }
}
