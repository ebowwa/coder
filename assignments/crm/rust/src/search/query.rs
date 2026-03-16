//! Search query parsing and execution
//!
//! Provides advanced query capabilities:
//! - Full-text search with relevance ranking
//! - Faceted search (by type, status, etc.)
//! - Range queries (by date, value)
//! - Boolean queries (AND, OR, NOT)

use napi::{bindgen_prelude::*, bindgen_prelude::Error};
use napi_derive::napi;
use tantivy::query::*;
use tantivy::collector::TopDocs;
use tantivy::schema::*;
use tantivy::Index;
use tantivy::Searcher;

/// Query parser for CRM search
pub struct CrmQueryParser {
    index: Index,
    schema: Schema,
}

impl CrmQueryParser {
    /// Parse a search string into a Tantivy query
    pub fn parse_search_string(&self, query: &str) -> Result<Query> {
        // Handle empty or whitespace-only queries
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(Query::match_all());
        }

        // Build query from search terms
        let mut query_builder = QueryParser::for_index(&self.index)
            .map_err(|e| Error::from_reason(format!("Query parse error: {}", e)))?;

        // Add each term as a fuzzy match for better results
        for term in trimmed.split_whitespace() {
            // Use term query for partial matching
            let term_query = TermQuery::new(
                query_builder.get_field("all_text")
                    .ok_or_else(|| Error::from_reason("Field 'all_text' not found"))?,
                term,
            );
            query_builder = query_builder.combine(term_query);
        }

        query_builder.build()
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Create a filtered query by entity type
    pub fn create_entity_filter(&self, entity_type: &str) -> Result<Query> {
        let field = self.schema.get_field("entity_type")
            .ok_or_else(|| Error::from_reason("Field 'entity_type' not found"))?;

        Query::term(field, entity_type)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Create a date range query
    pub fn create_date_range_query(
        &self,
        field_name: &str,
        start: i64,
        end: i64,
    ) -> Result<Query> {
        let field = self.schema.get_field(field_name)
            .ok_or_else(|| Error::from_reason(format!("Field '{}' not found", field_name)))?;

        Query::range(field, start..=end)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Create a numeric range query for deal values
    pub fn create_value_range_query(
        &self,
        min_value: Option<f64>,
        max_value: Option<f64>,
    ) -> Result<Query> {
        let field = self.schema.get_field("deal_value")
            .ok_or_else(|| Error::from_reason("Field 'deal_value' not found"))?;

        match (min_value, max_value) {
            (Some(min), Some(max)) => {
                Query::range(field, min..=max)
                    .map_err(|e| Error::from_reason(e.to_string()))
            }
            (Some(min), None) => {
                Query::range(field, min..)
                    .map_err(|e| Error::from_reason(e.to_string()))
            }
            (None, Some(max)) => {
                Query::range(field, ..=max)
                    .map_err(|e| Error::from_reason(e.to_string()))
            }
            (None, None) => {
                Ok(Query::match_all())
            }
        }
    }

    /// Combine multiple queries with AND
    pub fn and_queries(&self, queries: Vec<Query>) -> Result<Query> {
        if queries.is_empty() {
            return Ok(Query::match_all());
        }

        if queries.len() == 1 {
            return Ok(queries.into_iter().next().unwrap());
        }

        let mut combined = queries.into_iter().next().unwrap();
        for query in queries {
            combined = combined.and(query);
        }

        Ok(combined)
    }

    /// Combine multiple queries with OR
    pub fn or_queries(&self, queries: Vec<Query>) -> Result<Query> {
        if queries.is_empty() {
            return Ok(Query::match_all());
        }

        if queries.len() == 1 {
            return Ok(queries.into_iter().next().unwrap());
        }

        let mut combined = queries.into_iter().next().unwrap();
        for query in queries {
            combined = combined.or(query);
        }

        Ok(combined)
    }
}

impl CrmQueryParser {
    pub fn new(index: Index, schema: Schema) -> Self {
        Self { index, schema }
    }
}

/// Execute a search query and return results
#[napi]
pub fn execute_search(
    index: &CrmSearchIndex,
    query: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<CrmSearchResult>> {
    let limit = limit.unwrap_or(20) as usize;
    let offset = offset.unwrap_or(0) as usize;

    let index_guard = index.index.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let tantivy_index = index_guard.as_ref()
        .ok_or_else(|| Error::from_reason("Index not initialized"))?;

    let searcher = tantivy_index.reader()
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let parser = CrmQueryParser::new(tantivy_index.clone(), index.schema.clone());
    let parsed_query = parser.parse_search_string(&query)?;

    let collector = TopDocs::with_limit(limit + offset);

    let searcher = searcher.searcher()
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let top_docs = searcher.search(&parsed_query, collector)
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let mut results = Vec::with_capacity(limit);

    for (idx, score) in top_docs.score_docs().iter().skip(offset).take(limit) {
        if let Ok(doc) = searcher.doc(idx) {
            results.push(CrmSearchResult {
                id: extract_string_field(&doc, "id"),
                entity_type: extract_string_field(&doc, "entity_type"),
                name: extract_string_field(&doc, "name"),
                score: score,
            });
        }
    }

    Ok(results)
}

/// Extract a string field from a document
fn extract_string_field(doc: &Document, field_name: &str) -> String {
    doc.get_first(field_name)
        .and_then(|v| v.as_text().map(|s| s.to_string()))
        .unwrap_or_default()
}

/// Search result returned from native module
#[napi(object)]
pub struct CrmSearchResult {
    /// Entity ID
    pub id: String,
    /// Entity type (contact, deal, company)
    pub entity_type: String,
    /// Entity name/title
    pub name: String,
    /// Search relevance score
    pub score: f64,
}

/// Advanced search options for complex queries
#[napi(object)]
pub struct AdvancedSearchOptions {
    /// Search query string
    pub query: String,
    /// Filter by entity types
    pub entity_types: Option<Vec<String>>,
    /// Filter by tags (AND)
    pub tags: Option<Vec<String>>,
    /// Minimum deal value
    pub value_min: Option<f64>,
    /// Maximum deal value
    pub value_max: Option<f64>,
    /// Created after timestamp (Unix ms)
    pub created_after: Option<i64>,
    /// Created before timestamp (Unix ms)
    pub created_before: Option<i64>,
    /// Maximum results to return
    pub limit: Option<u32>,
    /// Offset for pagination
    pub offset: Option<u32>,
}

/// Execute an advanced search with multiple filters
#[napi]
pub fn execute_advanced_search(
    index: &CrmSearchIndex,
    options: AdvancedSearchOptions,
) -> Result<Vec<CrmSearchResult>> {
    let limit = options.limit.unwrap_or(20) as usize;
    let offset = options.offset.unwrap_or(0) as usize;

    let index_guard = index.index.read()
        .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

    let tantivy_index = index_guard.as_ref()
        .ok_or_else(|| Error::from_reason("Index not initialized"))?;

    let searcher = tantivy_index.reader()
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let parser = CrmQueryParser::new(tantivy_index.clone(), index.schema.clone());

    // Build base query from search string
    let mut queries = Vec::new();

    if !options.query.is_empty() {
        queries.push(parser.parse_search_string(&options.query)?);
    }

    // Add entity type filters
    if let Some(entity_types) = &options.entity_types {
        if entity_types.len() == 1 {
            queries.push(parser.create_entity_filter(&entity_types[0])?);
        } else {
            let mut type_queries: Vec<Query> = Vec::new();
            for entity_type in entity_types {
                type_queries.push(parser.create_entity_filter(entity_type)?);
            }
            queries.push(parser.or_queries(type_queries)?);
        }
    }

    // Add value range filter
    if options.value_min.is_some() || options.value_max.is_some() {
        queries.push(parser.create_value_range_query(
            options.value_min,
            options.value_max,
        )?);
    }

    // Add date range filter
    if options.created_after.is_some() || options.created_before.is_some() {
        let start = options.created_after.unwrap_or(0);
        let end = options.created_before.unwrap_or(i64::MAX);
        queries.push(parser.create_date_range_query("created_at", start, end)?);
    }

    // Combine all queries with AND
    let final_query = parser.and_queries(queries)?;

    let collector = TopDocs::with_limit(limit + offset);

    let tantivy_searcher = searcher.searcher()
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let top_docs = tantivy_searcher.search(&final_query, collector)
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let mut results = Vec::with_capacity(limit);

    for (idx, score) in top_docs.score_docs().iter().skip(offset).take(limit) {
        if let Ok(doc) = tantivy_searcher.doc(idx) {
            results.push(CrmSearchResult {
                id: extract_string_field(&doc, "id"),
                entity_type: extract_string_field(&doc, "entity_type"),
                name: extract_string_field(&doc, "name"),
                score: score,
            });
        }
    }

    Ok(results)
}
