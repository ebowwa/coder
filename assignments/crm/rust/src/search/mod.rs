//! Search module - Full-text search with Tantivy
//!
//! Provides high-performance full-text search capabilities
//! for CRM entities: contacts, deals, companies, activities.

mod index;
mod query;
mod schema;

use napi::bindgen_prelude::*;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tantivy::{Index, IndexReader, IndexWriter, Schema, TantivyError};

pub use index::*;
pub use query::*;
pub use schema::*;

/// Search index manager for CRM entities
#[napi]
pub struct CrmSearchIndex {
    index_path: PathBuf,
    index: Arc<RwLock<Option<Index>>>,
    schema: Schema,
}

#[napi]
impl CrmSearchIndex {
    /// Create a new search index at the specified path
    #[napi(constructor)]
    pub fn new(index_path: String) -> Result<Self> {
        let path = PathBuf::from(&index_path);
        let schema = create_crm_schema();

        let index = if path.exists() {
            Index::open_in_dir(&path).map_err(|e| Error::from_reason(e.to_string()))?
        } else {
            std::fs::create_dir_all(&path).map_err(|e| Error::from_reason(e.to_string()))?;
            Index::create_in_dir(&path, schema.clone()).map_err(|e| Error::from_reason(e.to_string()))?
        };

        Ok(Self {
            index_path: path,
            index: Arc::new(RwLock::new(Some(index))),
            schema,
        })
    }

    /// Index a contact for search
    #[napi]
    pub fn index_contact(
        &self,
        id: String,
        name: String,
        email: Option<String>,
        company: Option<String>,
        title: Option<String>,
        tags: Vec<String>,
        notes: Option<String>,
    ) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        add_contact_to_index(
            &mut writer,
            &self.schema,
            &id,
            &name,
            email.as_deref(),
            company.as_deref(),
            title.as_deref(),
            &tags,
            notes.as_deref(),
        )?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Index a deal for search
    #[napi]
    pub fn index_deal(
        &self,
        id: String,
        title: String,
        contact_id: String,
        value: f64,
        stage: String,
        notes: Option<String>,
        tags: Vec<String>,
    ) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        add_deal_to_index(
            &mut writer,
            &self.schema,
            &id,
            &title,
            &contact_id,
            value,
            &stage,
            notes.as_deref(),
            &tags,
        )?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Index a company for search
    #[napi]
    pub fn index_company(
        &self,
        id: String,
        name: String,
        website: Option<String>,
        industry: Option<String>,
        notes: Option<String>,
        tags: Vec<String>,
    ) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        add_company_to_index(
            &mut writer,
            &self.schema,
            &id,
            &name,
            website.as_deref(),
            industry.as_deref(),
            notes.as_deref(),
            &tags,
        )?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Search across all indexed entities
    #[napi]
    pub fn search(
        &self,
        query: String,
        entity_types: Option<Vec<String>>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<SearchResults> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let limit = limit.unwrap_or(20) as usize;
        let offset = offset.unwrap_or(0) as usize;

        execute_search(
            index,
            &self.schema,
            &query,
            entity_types.as_deref(),
            limit,
            offset,
        )
    }

    /// Delete an entity from the index
    #[napi]
    pub fn delete_entity(&self, entity_type: String, id: String) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        delete_from_index(&mut writer, &self.schema, &entity_type, &id)?;

        writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    /// Get index statistics
    #[napi]
    pub fn stats(&self) -> Result<IndexStats> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        get_index_stats(index, &self.schema)
    }

    /// Clear all documents from the index
    #[napi]
    pub fn clear(&self) -> Result<()> {
        let index_guard = self.index.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        let index = index_guard.as_ref()
            .ok_or_else(|| Error::from_reason("Index not initialized"))?;

        let mut writer = index.writer(50_000_000)
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

        let mut writer = index.writer(50_000_000)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        // Merge segments for faster queries
        writer.wait_merging_threads().map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }
}

/// Search result item
#[napi(object)]
pub struct SearchResult {
    pub id: String,
    pub entity_type: String,
    pub score: f64,
    pub highlights: Vec<String>,
}

/// Search results container
#[napi(object)]
pub struct SearchResults {
    pub items: Vec<SearchResult>,
    pub total: i32,
    pub query: String,
    pub took_ms: i32,
}

/// Index statistics
#[napi(object)]
pub struct IndexStats {
    pub num_contacts: i32,
    pub num_deals: i32,
    pub num_companies: i32,
    pub total_docs: i32,
    pub index_size_bytes: i64,
}

/// Perform a quick search without managing an index instance
#[napi]
pub fn quick_search(
    index_path: String,
    query: String,
    limit: Option<i32>,
) -> Result<SearchResults> {
    let search_index = CrmSearchIndex::new(index_path)?;
    search_index.search(query, None, limit, None)
}
