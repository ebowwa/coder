//! Search index module
//!
//! Provides index management for CRM search

use tantivy::Index;
use tantivy::schema::Schema;

/// Create or open a search index
pub fn create_or_open_index(path: &std::path::Path, schema: Schema) -> Result<Index, String> {
    if path.exists() {
        Index::open_in_dir(path).map_err(|e| e.to_string())
    } else {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        Index::create_in_dir(path, schema).map_err(|e| e.to_string())
    }
}
