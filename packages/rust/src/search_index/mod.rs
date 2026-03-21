//! Code Search Index - Full-text search with Tantivy
//!
//! Provides high-performance full-text search for code:
//! - BM25 ranking for relevance
//! - Fuzzy matching for typo tolerance
//! - Fielded search (symbols, imports, content)
//! - Incremental updates via file watcher

mod schema;
mod indexer;
mod searcher;

use napi::bindgen_prelude::*;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tantivy::Index;
use tantivy::TantivyDocument;

pub use schema::*;
pub use indexer::*;
pub use searcher::*;

/// Code search index manager
#[napi]
pub struct CodeSearchIndex {
    index_path: PathBuf,
    index: Arc<RwLock<Option<Index>>>,
    schema: tantivy::schema::Schema,
}

#[napi]
impl CodeSearchIndex {
    /// Create or open a code search index at the specified path
    #[napi(constructor)]
    pub fn new(index_path: String) -> Result<Self> {
        let path = PathBuf::from(&index_path);
        let schema = create_code_schema();

        let index = if path.exists() {
            // Try to open existing, recreate if schema mismatch
            match Index::open_in_dir(&path) {
                Ok(idx) => idx,
                Err(_) => {
                    // Schema changed, recreate
                    std::fs::remove_dir_all(&path)
                        .map_err(|e| Error::from_reason(e.to_string()))?;
                    std::fs::create_dir_all(&path)
                        .map_err(|e| Error::from_reason(e.to_string()))?;
                    Index::create_in_dir(&path, schema.clone())
                        .map_err(|e| Error::from_reason(e.to_string()))?
                }
            }
        } else {
            std::fs::create_dir_all(&path)
                .map_err(|e| Error::from_reason(e.to_string()))?;
            Index::create_in_dir(&path, schema.clone())
                .map_err(|e| Error::from_reason(e.to_string()))?
        };

        Ok(Self {
            index_path: path,
            index: Arc::new(RwLock::new(Some(index))),
            schema,
        })
    }

    /// Index a single file
    #[napi]
    pub fn index_file(
        &self,
        path: String,
        content: String,
        language: Option<String>,
        symbols: Option<Vec<SymbolInfo>>,
    ) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer: tantivy::IndexWriter<TantivyDocument> = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        add_file_to_index(
            &mut writer,
            &self.schema,
            &path,
            &content,
            language.as_deref(),
            symbols.as_ref(),
        )?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Index multiple files in batch
    #[napi]
    pub fn index_batch(&self, files: Vec<IndexFile>) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer: tantivy::IndexWriter<TantivyDocument> = index.writer(100_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        for file in &files {
            add_file_to_index(
                &mut writer,
                &self.schema,
                &file.path,
                &file.content,
                file.language.as_deref(),
                file.symbols.as_ref(),
            )?;
        }

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Index a directory of files
    #[napi]
    pub fn index_directory(
        &self,
        dir_path: String,
        extensions: Option<Vec<String>>,
    ) -> Result<i32> {
        let exts: Option<Vec<&str>> = extensions.as_ref()
            .map(|e| e.iter().map(|s| s.as_str()).collect());

        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer: tantivy::IndexWriter<TantivyDocument> = index.writer(100_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        let ext_refs: Option<Vec<&str>> = exts.as_ref().map(|v| v.clone());
        let count = crate::search_index::indexer::index_directory(
            &mut writer,
            &self.schema,
            &dir_path,
            ext_refs.as_ref().map(|v| v.as_slice()),
        )?;

        Ok(count as i32)
    }

    /// Search the code index
    #[napi]
    pub fn search(
        &self,
        query: String,
        options: Option<SearchOptions>,
    ) -> Result<CodeSearchResults> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        execute_code_search(index, &self.schema, &query, options)
    }

    /// Search for symbols (functions, classes, etc.)
    #[napi]
    pub fn search_symbols(
        &self,
        query: String,
        symbol_type: Option<String>,
        limit: Option<i32>,
    ) -> Result<CodeSearchResults> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        execute_symbol_search(index, &self.schema, &query, symbol_type.as_deref(), limit)
    }

    /// Delete a file from the index
    #[napi]
    pub fn delete_file(&self, path: String) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer: tantivy::IndexWriter<TantivyDocument> = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        delete_file_from_index(&mut writer, &self.schema, &path)?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Get index statistics
    #[napi]
    pub fn stats(&self) -> Result<CodeIndexStats> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        get_code_index_stats(index, &self.schema, &self.index_path)
    }

    /// Clear all documents from the index
    #[napi]
    pub fn clear(&self) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer: tantivy::IndexWriter<TantivyDocument> = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        writer.delete_all_documents().map_err(|e| Error::from_reason(e.to_string()))?;
        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }

    /// Optimize the index for better search performance
    #[napi]
    pub fn optimize(&self) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let writer: tantivy::IndexWriter<TantivyDocument> = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        // Block until merges complete
        writer.wait_merging_threads().map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }

    /// Get the index path
    #[napi(getter)]
    pub fn path(&self) -> String {
        self.index_path.to_string_lossy().to_string()
    }

    /// Get number of indexed documents
    #[napi]
    pub fn document_count(&self) -> Result<i32> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let reader = index.reader().map_err(|e| Error::from_reason(e.to_string()))?;
        let searcher = reader.searcher();

        Ok(searcher.num_docs() as i32)
    }
}

/// File to index
#[napi(object)]
pub struct IndexFile {
    pub path: String,
    pub content: String,
    pub language: Option<String>,
    pub symbols: Option<Vec<SymbolInfo>>,
}

/// Symbol information extracted from code
#[napi(object)]
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: String, // function, class, method, variable, etc.
    pub line: u32,
    pub column: Option<u32>,
}

/// Search options
#[napi(object)]
pub struct SearchOptions {
    /// Maximum results to return
    pub limit: Option<i32>,
    /// Offset for pagination
    pub offset: Option<i32>,
    /// Filter by language
    pub language: Option<String>,
    /// Filter by directory
    pub directory: Option<String>,
    /// Search in symbols only
    pub symbols_only: Option<bool>,
    /// Search in imports only
    pub imports_only: Option<bool>,
    /// Enable fuzzy matching
    pub fuzzy: Option<bool>,
    /// Fields to search (path, content, symbols, imports)
    pub fields: Option<Vec<String>>,
}

/// Search result item
#[napi(object)]
pub struct CodeSearchResult {
    pub path: String,
    pub language: Option<String>,
    pub score: f64,
    /// Matching snippets with highlights
    pub snippets: Vec<String>,
    /// Matching symbols
    pub matched_symbols: Vec<SymbolMatch>,
}

/// Symbol match in search results
#[napi(object)]
pub struct SymbolMatch {
    pub name: String,
    pub kind: String,
    pub line: u32,
    pub context: Option<String>,
}

/// Search results container
#[napi(object)]
pub struct CodeSearchResults {
    pub total: i32,
    pub query: String,
    pub took_ms: i32,
    pub items: Vec<CodeSearchResult>,
}

/// Index statistics
#[napi(object)]
pub struct CodeIndexStats {
    pub total_files: i32,
    pub total_symbols: i32,
    pub languages: Vec<LanguageStats>,
    pub index_size_bytes: i64,
    pub last_updated: Option<String>,
}

/// Per-language statistics
#[napi(object)]
pub struct LanguageStats {
    pub language: String,
    pub file_count: i32,
    pub symbol_count: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_creation() {
        let schema = create_code_schema();
        assert!(schema.get_field("path").is_ok());
        assert!(schema.get_field("content").is_ok());
    }
}
