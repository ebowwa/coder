//! CRM Native Module
//!
//! High-performance Rust implementation for CRM operations:
//! - Full-text search with Tantivy
//! - Index management for contacts, deals, companies
//! - Media metadata extraction (images, audio, video)
//!
//! Built with NAPI-RS for Node.js/Bun integration.

mod search;
mod index;
mod media;
mod utils;

use napi::bindgen_prelude::*;

/// CRM native module initialization
#[napi]
pub fn init() -> Result<()> {
    Ok(())
}

// Re-export public API
pub use search::CrmSearchIndex;
pub use search::CrmSearchOptions;
pub use search::CrmSearchResult;
pub use index::CrmIndexManager;
pub use index::CrmContact;
pub use index::CrmDeal;
pub use index::CrmCompany;
pub use index::CrmCounts;
pub use media::MediaMetadata;
pub use media::extract_media_metadata;
pub use media::extract_media_metadata_batch;
pub use media::generate_thumbnail;
pub use media::is_valid_media_type;
