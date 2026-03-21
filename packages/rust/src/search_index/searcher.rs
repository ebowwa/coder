//! Search operations - query execution and result handling

use tantivy::Index;
use tantivy::schema::{Schema, Value, IndexRecordOption};
use tantivy::query::{QueryParser, BooleanQuery, Occur, TermQuery, FuzzyTermQuery};
use tantivy::collector::{TopDocs, Count};
use tantivy::TantivyDocument;

use napi::Error;
use std::time::Instant;

use super::schema::*;
use super::{CodeSearchResult, CodeSearchResults, CodeIndexStats, LanguageStats, SymbolMatch, SearchOptions, SymbolInfo};

/// Execute a code search query
pub fn execute_code_search(
    index: &Index,
    schema: &Schema,
    query: &str,
    options: Option<SearchOptions>,
) -> Result<CodeSearchResults, Error> {
    let start = Instant::now();
    let opts = options.unwrap_or(SearchOptions {
        limit: Some(50),
        offset: Some(0),
        language: None,
        directory: None,
        symbols_only: Some(false),
        imports_only: Some(false),
        fuzzy: Some(false),
        fields: None,
    });

    let limit = opts.limit.unwrap_or(50) as usize;
    let offset = opts.offset.unwrap_or(0) as usize;

    let reader = index.reader().map_err(|e| Error::from_reason(e.to_string()))?;
    let searcher = reader.searcher();

    // Build query
    let parsed_query = build_search_query(index, schema, query, &opts)?;

    // Execute search
    let (top_docs, count) = searcher
        .search(&parsed_query, &(TopDocs::with_limit(limit + offset), Count))
        .map_err(|e| Error::from_reason(e.to_string()))?;

    let total = count as i32;

    // Process results
    let fields = CodeSchemaFields::from_schema(schema);
    let mut items = Vec::new();

    for (_score, doc_address) in top_docs.into_iter().skip(offset) {
        if let Ok(doc) = searcher.doc::<TantivyDocument>(doc_address) {
            if let Some(result) = doc_to_search_result(&doc, &fields, _score as f64) {
                items.push(result);
            }
        }
    }

    let took_ms = start.elapsed().as_millis() as i32;

    Ok(CodeSearchResults {
        total,
        query: query.to_string(),
        took_ms,
        items,
    })
}

/// Execute a symbol search
pub fn execute_symbol_search(
    index: &Index,
    schema: &Schema,
    query: &str,
    symbol_type: Option<&str>,
    limit: Option<i32>,
) -> Result<CodeSearchResults, Error> {
    let start = Instant::now();
    let limit = limit.unwrap_or(20) as usize;

    let reader = index.reader().map_err(|e| Error::from_reason(e.to_string()))?;
    let searcher = reader.searcher();

    let fields = CodeSchemaFields::from_schema(schema);

    // Build symbol query
    let symbol_field = schema.get_field("symbols").map_err(|e| Error::from_reason(e.to_string()))?;

    let parsed_query: Box<dyn tantivy::query::Query> = if query.len() >= 3 {
        // Use fuzzy for longer queries
        let term = tantivy::Term::from_field_text(symbol_field, query);
        Box::new(FuzzyTermQuery::new(term, 1, true))
    } else {
        let term = tantivy::Term::from_field_text(symbol_field, query);
        Box::new(TermQuery::new(term, IndexRecordOption::Basic))
    };

    // Execute search
    let top_docs = searcher
        .search(&parsed_query, &TopDocs::with_limit(limit))
        .map_err(|e| Error::from_reason(e.to_string()))?;

    // Process results
    let mut items = Vec::new();

    for (_score, doc_address) in top_docs {
        if let Ok(doc) = searcher.doc::<TantivyDocument>(doc_address) {
            if let Some(mut result) = doc_to_search_result(&doc, &fields, _score as f64) {
                // Filter by symbol type if specified
                if let Some(sym_type) = symbol_type {
                    result.matched_symbols.retain(|s| {
                        s.kind.to_lowercase() == sym_type.to_lowercase()
                    });
                }
                if !result.matched_symbols.is_empty() {
                    items.push(result);
                }
            }
        }
    }

    let took_ms = start.elapsed().as_millis() as i32;
    let total = items.len() as i32;

    Ok(CodeSearchResults {
        total,
        query: query.to_string(),
        took_ms,
        items,
    })
}

/// Build a search query from options
fn build_search_query(
    index: &Index,
    schema: &Schema,
    query_text: &str,
    opts: &SearchOptions,
) -> Result<Box<dyn tantivy::query::Query>, Error> {
    let fields = CodeSchemaFields::from_schema(schema);

    // Determine which fields to search
    let search_fields: Vec<tantivy::schema::Field> = if let Some(field_names) = &opts.fields {
        field_names
            .iter()
            .filter_map(|name| schema.get_field(name).ok())
            .collect()
    } else if opts.symbols_only.unwrap_or(false) {
        vec![fields.symbols]
    } else if opts.imports_only.unwrap_or(false) {
        vec![fields.imports]
    } else {
        vec![fields.content, fields.symbols, fields.filename, fields.path]
    };

    // Create query parser
    let mut query_parser = QueryParser::for_index(index, search_fields.clone());
    query_parser.set_conjunction_by_default();

    // Build queries
    let mut queries: Vec<(Occur, Box<dyn tantivy::query::Query>)> = Vec::new();

    // Main text query
    let main_query: Box<dyn tantivy::query::Query> = if opts.fuzzy.unwrap_or(false) && query_text.len() >= 3 {
        // Fuzzy query across all fields
        let mut fuzzy_queries: Vec<(Occur, Box<dyn tantivy::query::Query>)> = Vec::new();
        for field in &search_fields {
            let term = tantivy::Term::from_field_text(*field, query_text);
            fuzzy_queries.push((Occur::Should, Box::new(FuzzyTermQuery::new(term, 2, true))));
        }
        Box::new(BooleanQuery::new(fuzzy_queries))
    } else {
        // Regular parsed query
        query_parser
            .parse_query(query_text)
            .map_err(|e| Error::from_reason(e.to_string()))?
    };

    queries.push((Occur::Must, main_query));

    // Add language filter
    if let Some(lang) = &opts.language {
        let lang_field = schema.get_field("language").map_err(|e| Error::from_reason(e.to_string()))?;
        let term = tantivy::Term::from_field_text(lang_field, lang);
        queries.push((Occur::Must, Box::new(TermQuery::new(term, IndexRecordOption::Basic))));
    }

    // Add directory filter
    if let Some(dir) = &opts.directory {
        let dir_field = schema.get_field("directory").map_err(|e| Error::from_reason(e.to_string()))?;
        let term = tantivy::Term::from_field_text(dir_field, dir);
        queries.push((Occur::Must, Box::new(TermQuery::new(term, IndexRecordOption::Basic))));
    }

    Ok(Box::new(BooleanQuery::new(queries)))
}

/// Convert a document to a search result
fn doc_to_search_result(
    doc: &TantivyDocument,
    fields: &CodeSchemaFields,
    score: f64,
) -> Option<CodeSearchResult> {
    // Extract path (required)
    let path = doc
        .get_first(fields.path)
        .and_then(|v| v.as_str())?
        .to_string();

    // Extract optional fields
    let language = doc
        .get_first(fields.language)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Extract snippets from content
    let snippets = extract_snippets(doc, fields);

    // Extract matched symbols
    let matched_symbols = extract_symbols(doc, fields);

    Some(CodeSearchResult {
        path,
        language,
        score,
        snippets,
        matched_symbols,
    })
}

/// Extract matching snippets from document
fn extract_snippets(doc: &TantivyDocument, fields: &CodeSchemaFields) -> Vec<String> {
    let mut snippets = Vec::new();

    // Get content and create snippets
    if let Some(content) = doc.get_first(fields.content).and_then(|v| v.as_str()) {
        // Take first few non-empty lines as preview
        let lines: Vec<&str> = content
            .lines()
            .filter(|l| !l.trim().is_empty())
            .take(5)
            .collect();

        if !lines.is_empty() {
            snippets.push(lines.join("\n"));
        }
    }

    snippets
}

/// Extract symbol matches from document
fn extract_symbols(doc: &TantivyDocument, fields: &CodeSchemaFields) -> Vec<SymbolMatch> {
    let mut symbols = Vec::new();

    // Try to parse symbol definitions JSON
    if let Some(json) = doc.get_first(fields.symbol_defs).and_then(|v| v.as_str()) {
        if let Ok(sym_infos) = serde_json::from_str::<Vec<SymbolInfo>>(json) {
            for info in sym_infos {
                symbols.push(SymbolMatch {
                    name: info.name,
                    kind: info.kind,
                    line: info.line,
                    context: None,
                });
            }
        }
    }

    symbols
}

/// Get index statistics
pub fn get_code_index_stats(
    index: &Index,
    schema: &Schema,
    index_path: &std::path::Path,
) -> Result<CodeIndexStats, Error> {
    let reader = index.reader().map_err(|e| Error::from_reason(e.to_string()))?;
    let searcher = reader.searcher();

    let fields = CodeSchemaFields::from_schema(schema);

    // Count total documents
    let total_files = searcher.num_docs() as i32;

    // Count languages and symbols
    let mut language_counts: std::collections::HashMap<String, (i32, i32)> = std::collections::HashMap::new();
    let mut total_symbols = 0i32;

    for segment_reader in searcher.segment_readers() {
        let store_reader = segment_reader
            .get_store_reader(1)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        for doc_id in 0..segment_reader.max_doc() {
            if let Ok(doc) = store_reader.get::<TantivyDocument>(doc_id) {
                let lang = doc
                    .get_first(fields.language)
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");

                let entry = language_counts.entry(lang.to_string()).or_insert((0, 0));
                entry.0 += 1;

                // Count symbols in this doc
                if let Some(json) = doc.get_first(fields.symbol_defs).and_then(|v| v.as_str()) {
                    if let Ok(syms) = serde_json::from_str::<Vec<SymbolInfo>>(json) {
                        entry.1 += syms.len() as i32;
                        total_symbols += syms.len() as i32;
                    }
                }
            }
        }
    }

    let languages: Vec<LanguageStats> = language_counts
        .into_iter()
        .map(|(language, (file_count, symbol_count))| LanguageStats {
            language,
            file_count,
            symbol_count,
        })
        .collect();

    // Get index size
    let index_size_bytes = get_index_size(index_path);

    Ok(CodeIndexStats {
        total_files,
        total_symbols,
        languages,
        index_size_bytes,
        last_updated: Some(chrono::Utc::now().to_rfc3339()),
    })
}

/// Get the size of the index on disk
fn get_index_size(path: &std::path::Path) -> i64 {
    use std::fs;

    let mut total_size: i64 = 0;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total_size += metadata.len() as i64;
                }
            }
        }
    }

    total_size
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_creation() {
        let schema = super::super::schema::create_code_schema();
        assert!(schema.get_field("path").is_ok());
        assert!(schema.get_field("content").is_ok());
    }
}
