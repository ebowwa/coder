//! Company indexing operations
//!
//! Specialized indexing and querying for company entities.

use crate::index::{CrmIndexManager, CrmCompany};

/// Index a batch of companies
#[napi]
pub fn index_companies_batch(
    manager: &CrmIndexManager,
    companies: Vec<CrmCompany>,
) -> Result<usize, Error> {
    let mut success_count = 0;
    for company in companies {
        manager.index_company(company)?;
        success_count += 1;
    }
    Ok(success_count)
}

/// Search companies by name (fuzzy match)
#[napi]
pub fn search_companies_by_name(
    manager: &CrmIndexManager,
    name_query: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let companies = manager.companies.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let query_lower = name_query.to_lowercase();
    let mut results: Vec<(String, i32)> = Vec::new();

    for (id, company) in companies.iter() {
        let name_lower = company.name.to_lowercase();
        let score = calculate_company_fuzzy_score(&query_lower, &name_lower);
        if score > 0 {
            results.push((id.clone(), score));
        }
    }

    results.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(results.into_iter().take(limit).map(|(id, _)| id).collect())
}

/// Search companies by industry
#[napi]
pub fn search_companies_by_industry(
    manager: &CrmIndexManager,
    industries: Vec<String>,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(50) as usize;
    let companies = manager.companies.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let industries_lower: Vec<String> = industries.iter().map(|i| i.to_lowercase()).collect();
    let mut results: Vec<String> = Vec::new();

    for (id, company) in companies.iter() {
        if let Some(industry) = &company.industry {
            if industries_lower.contains(&industry.to_lowercase()) {
                results.push(id.clone());
            }
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Search companies by tags
#[napi]
pub fn search_companies_by_tags(
    manager: &CrmIndexManager,
    tags: Vec<String>,
    match_all: bool,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let companies = manager.companies.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();
    let mut results: Vec<String> = Vec::new();

    for (id, company) in companies.iter() {
        let company_tags_lower: Vec<String> = company.tags.iter().map(|t| t.to_lowercase()).collect();

        let matches = if match_all {
            tags_lower.iter().all(|t| company_tags_lower.contains(t))
        } else {
            tags_lower.iter().any(|t| company_tags_lower.contains(t))
        };

        if matches {
            results.push(id.clone());
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Search companies by website domain
#[napi]
pub fn search_companies_by_website_domain(
    manager: &CrmIndexManager,
    domain: String,
    limit: Option<u32>,
) -> Result<Vec<String>, Error> {
    let limit = limit.unwrap_or(20) as usize;
    let companies = manager.companies.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let domain_lower = domain.to_lowercase();
    let mut results: Vec<String> = Vec::new();

    for (id, company) in companies.iter() {
        if let Some(website) = &company.website {
            // Extract domain from URL
            let website_domain = extract_domain_from_url(website);
            if website_domain.to_lowercase() == domain_lower {
                results.push(id.clone());
            }
        }
    }

    Ok(results.into_iter().take(limit).collect())
}

/// Get company statistics by industry
#[napi]
pub fn get_company_stats_by_industry(
    manager: &CrmIndexManager,
) -> Result<HashMap<String, u32>, Error> {
    let companies = manager.companies.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let mut industry_counts: HashMap<String, u32> = HashMap::new();

    for company in companies.values() {
        if let Some(industry) = &company.industry {
            *industry_counts.entry(industry.clone()).or_insert(0) += 1;
        }
    }

    Ok(industry_counts)
}

/// Extract domain from URL
fn extract_domain_from_url(url: &str) -> String {
    // Remove protocol
    let without_protocol = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .or_else(|| url.strip_prefix("www."))
        .unwrap_or(url);

    // Get domain part (before first /)
    without_protocol
        .split('/')
        .next()
        .unwrap_or(without_protocol)
        .to_string()
}

/// Calculate fuzzy match score for companies
fn calculate_company_fuzzy_score(query: &str, target: &str) -> i32 {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_domain_from_url() {
        assert_eq!(extract_domain_from_url("https://example.com/path"), "example.com");
        assert_eq!(extract_domain_from_url("http://www.example.com"), "example.com");
        assert_eq!(extract_domain_from_url("example.com"), "example.com");
    }
}
