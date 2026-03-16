//! Deal indexing operations
//!
//! Specialized indexing and querying for deal entities.

use crate::index::{CrmIndexManager, CrmDeal};

/// Index a batch of deals
#[napi]
pub fn index_deals_batch(
    manager: &CrmIndexManager,
    deals: Vec<CrmDeal>,
) -> Result<usize, Error> {
    let mut success_count = 0;
    for deal in deals {
        manager.index_deal(deal)?;
        success_count += 1;
    }
    Ok(success_count)
}

/// Search deals by title (fuzzy match)
#[napi]
pub fn search_deals_by_title(
    manager: &CrmIndexManager,
    title_query: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let query_lower = title_query.to_lowercase();
    let mut results: Vec<(String, i32)> = Vec::new();

    for (id, deal) in deals.iter() {
        let title_lower = deal.title.to_lowercase();
        let score = calculate_deal_fuzzy_score(&query_lower, &title_lower);
        if score > 0 {
            results.push((id.clone(), score));
        }
    }

    results.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search deals by stage
#[napi]
pub fn search_deals_by_stage(
    manager: &CrmIndexManager,
    stages: Vec<String>,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(50) as usize;
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let stages_lower: Vec<String> = stages.iter().map(|s| s.to_lowercase()).collect();
    let mut results: Vec<String> = Vec::new();

    for (id, deal) in deals.iter() {
        if stages_lower.contains(&deal.stage.to_lowercase()) {
            results.push(id.clone());
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Search deals by value range
#[napi]
pub fn search_deals_by_value_range(
    manager: &CrmIndexManager,
    min_value: Option<f64>,
    max_value: Option<f64>,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(50) as usize;
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let mut results: Vec<(String, f64)> = Vec::new();

    for (id, deal) in deals.iter() {
        let value = deal.value;
        let matches_min = min_value.map_or(true, |min| value >= min);
        let matches_max = max_value.map_or(true, |max| value <= max);

        if matches_min && matches_max {
            results.push((id.clone(), value));
        }
    }

    // Sort by value descending
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search deals by contact ID
#[napi]
pub fn search_deals_by_contact(
    manager: &CrmIndexManager,
    contact_id: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(50) as usize;
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let mut results: Vec<(String, i64)> = Vec::new();

    for (id, deal) in deals.iter() {
        if deal.contact_id == contact_id {
            results.push((id.clone(), deal.updated_at));
        }
    }

    // Sort by updated_at descending
    results.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search deals expected to close within date range
#[napi]
pub fn search_deals_closing_soon(
    manager: &CrmIndexManager,
    days_ahead: u32,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(50) as usize;
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let now = chrono::Utc::now().timestamp();
    let future_cutoff = now + (days_ahead as i64 * 86400); // days to seconds

    let mut results: Vec<(String, i64)> = Vec::new();

    for (id, deal) in deals.iter() {
        if let Some(expected_close) = deal.expected_close {
            if expected_close >= now && expected_close <= future_cutoff {
                results.push((id.clone(), expected_close));
            }
        }
    }

    // Sort by expected_close ascending (soonest first)
    results.sort_by(|a, b| a.1.cmp(&b.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Get total deal value by stage
#[napi]
pub fn get_deal_values_by_stage(
    manager: &CrmIndexManager,
) -> Result<HashMap<String, f64>, Error> {
    let deals = manager.deals.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let mut stage_values: HashMap<String, f64> = HashMap::new();

    for deal in deals.values() {
        *stage_values.entry(deal.stage.clone()).or_insert(0.0) += deal.value;
    }

    Ok(stage_values)
}

/// Calculate fuzzy match score for deals
fn calculate_deal_fuzzy_score(query: &str, target: &str) -> i32 {
    if query == target {
        return 100;
    }
    if target.starts_with(query) {
        return 80;
    }
    if target.contains(query) {
        return 60;
    }
    if query.contains(target) {
        return 40;
    }

    let query_words: Vec<&str> = query.split_whitespace().collect();
    let target_words: Vec<&str> = target.split_whitespace().collect();

    let mut word_matches = 0;
    for q_word in &query_words {
        for t_word in &target_words {
            if q_word == t_word {
                word_matches += 20;
            } else if t_word.starts_with(q_word) || t_word.contains(q_word) {
                word_matches += 10;
            }
        }
    }

    word_matches
}
