//! Contact indexing operations
//!
//! Specialized indexing and querying for contact entities.

use crate::index::{CrmIndexManager, CrmContact};

/// Index a batch of contacts
#[napi]
pub fn index_contacts_batch(
    manager: &CrmIndexManager,
    contacts: Vec<CrmContact>,
) -> Result<usize, Error> {
    let mut success_count = 0;
    for contact in contacts {
        manager.index_contact(contact)?;
        success_count += 1;
    }
    Ok(success_count)
}

/// Search contacts by name (fuzzy match)
#[napi]
pub fn search_contacts_by_name(
    manager: &CrmIndexManager,
    name_query: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let contacts = manager.contacts.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let query_lower = name_query.to_lowercase();
    let mut results: Vec<(String, i32)> = Vec::new();

    for (id, contact) in contacts.iter() {
        let name_lower = contact.name.to_lowercase();
        let score = calculate_fuzzy_score(&query_lower, &name_lower);
        if score > 0 {
            results.push((id.clone(), score));
        }
    }

    // Sort by score descending
    results.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search contacts by company name
#[napi]
pub fn search_contacts_by_company(
    manager: &CrmIndexManager,
    company_query: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let contacts = manager.contacts.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let query_lower = company_query.to_lowercase();
    let mut results: Vec<(String, i32)> = Vec::new();

    for (id, contact) in contacts.iter() {
        if let Some(company) = &contact.company {
            let company_lower = company.to_lowercase();
            let score = calculate_fuzzy_score(&query_lower, &company_lower);
            if score > 0 {
                results.push((id.clone(), score));
            }
        }
    }

    results.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search contacts by tags
#[napi]
pub fn search_contacts_by_tags(
    manager: &CrmIndexManager,
    tags: Vec<String>,
    match_all: bool,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let contacts = manager.contacts.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();
    let mut results: Vec<String> = Vec::new();

    for (id, contact) in contacts.iter() {
        let contact_tags_lower: Vec<String> = contact.tags.iter().map(|t| t.to_lowercase()).collect();

        let matches = if match_all {
            // All search tags must be present
            tags_lower.iter().all(|t| contact_tags_lower.contains(t))
        } else {
            // Any search tag matches
            tags_lower.iter().any(|t| contact_tags_lower.contains(t))
        };

        if matches {
            results.push(id.clone());
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Search contacts by email domain
#[napi]
pub fn search_contacts_by_email_domain(
    manager: &CrmIndexManager,
    domain: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let contacts = manager.contacts.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let domain_lower = domain.to_lowercase();
    let mut results: Vec<String> = Vec::new();

    for (id, contact) in contacts.iter() {
        if let Some(email) = &contact.email {
            if let Some(email_domain) = email.split('@').nth(1) {
                if email_domain.to_lowercase() == domain_lower {
                    results.push(id.clone());
                }
            }
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Calculate fuzzy match score (simple implementation)
fn calculate_fuzzy_score(query: &str, target: &str) -> i32 {
    // Exact match
    if query == target {
        return 100;
    }

    // Starts with query
    if target.starts_with(query) {
        return 80;
    }

    // Contains query
    if target.contains(query) {
        return 60;
    }

    // Query contains target
    if query.contains(target) {
        return 40;
    }

    // Word-level matching
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fuzzy_score_exact_match() {
        assert_eq!(calculate_fuzzy_score("john", "john"), 100);
    }

    #[test]
    fn test_fuzzy_score_starts_with() {
        assert_eq!(calculate_fuzzy_score("joh", "john doe"), 80);
    }

    #[test]
    fn test_fuzzy_score_contains() {
        assert_eq!(calculate_fuzzy_score("doe", "john doe"), 60);
    }

    #[test]
    fn test_fuzzy_score_word_match() {
        assert_eq!(calculate_fuzzy_score("john", "john smith"), 20);
    }
}
