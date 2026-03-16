//! Index management for CRM entities
//!
//! Provides CRUD operations for contacts, deals, and and companies
//! using Tantivy for full-text search indexing.

mod contact;
mod deal;
mod company;
mod utils;

use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Contact entity for indexing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedContact {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub company: Option<String>,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Deal entity for indexing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedDeal {
    pub id: String,
    pub title: String,
    pub contact_id: String,
    pub value: f64,
    pub stage: String,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub expected_close: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Company entity for indexing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedCompany {
    pub id: String,
    pub name: String,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Index manager for all CRM entities
#[napi]
pub struct CrmIndexManager {
    contacts: Arc<RwLock<HashMap<String, IndexedContact>>>,
    deals: Arc<RwLock<HashMap<String, IndexedDeal>>>,
    companies: Arc<RwLock<HashMap<String, IndexedCompany>>>,
}

#[napi]
impl CrmIndexManager {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            contacts: Arc::new(RwLock::new(HashMap::new())),
            deals: Arc::new(RwLock::new(HashMap::new())),
            companies: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Index a contact
    #[napi]
    pub fn index_contact(
        &self,
        contact: CrmContact,
    ) -> Result<()> {
        let id = contact.id.clone();
        let indexed = IndexedContact {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            company: contact.company,
            title: contact.title,
            tags: contact.tags,
            notes: contact.notes,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
        };

        let mut contacts = self.contacts.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        contacts.insert(id, indexed);
        Ok(())
    }

    /// Get a contact by ID
    #[napi]
    pub fn get_contact(&self, id: String) -> Result<Option<CrmContact>> {
        let contacts = self.contacts.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        contacts.get(&id).map(|c| CrmContact {
            id: c.id,
            name: c.name,
            email: c.email.clone(),
            company: c.company.clone(),
            title: c.title.clone(),
            tags: c.tags.clone(),
            notes: c.notes.clone(),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }).ok_or(None)
    }

    /// Remove a contact
    #[napi]
    pub fn remove_contact(&self, id: String) -> Result<()> {
        let mut contacts = self.contacts.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        contacts.remove(&id);
        Ok(())
    }

    /// Index a deal
    #[napi]
    pub fn index_deal(&self, deal: CrmDeal) -> Result<()> {
        let id = deal.id.clone();
        let indexed = IndexedDeal {
            id: deal.id,
            title: deal.title,
            contact_id: deal.contact_id,
            value: deal.value,
            stage: deal.stage,
            tags: deal.tags,
            notes: deal.notes,
            expected_close: deal.expected_close,
            created_at: deal.created_at,
            updated_at: deal.updated_at,
        };

        let mut deals = self.deals.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        deals.insert(id, indexed);
        Ok(())
    }

    /// Get a deal by ID
    #[napi]
    pub fn get_deal(&self, id: String) -> Result<Option<CrmDeal>> {
        let deals = self.deals.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        deals.get(&id).map(|d| CrmDeal {
            id: d.id,
            title: d.title,
            contact_id: d.contact_id,
            value: d.value,
            stage: d.stage,
            tags: d.tags.clone(),
            notes: d.notes.clone(),
            expected_close: d.expected_close,
            created_at: d.created_at,
            updated_at: d.updated_at,
        }).ok_or(None)
    }

    /// Remove a deal
    #[napi]
    pub fn remove_deal(&self, id: String) -> Result<()> {
        let mut deals = self.deals.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        deals.remove(&id);
        Ok(())
    }

    /// Index a company
    #[napi]
    pub fn index_company(&self, company: CrmCompany) -> Result<()> {
        let id = company.id.clone();
        let indexed = IndexedCompany {
            id: company.id,
            name: company.name,
            website: company.website,
            industry: company.industry,
            tags: company.tags,
            notes: company.notes,
            created_at: company.created_at,
            updated_at: company.updated_at,
        };

        let mut companies = self.companies.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        companies.insert(id, indexed);
        Ok(())
    }

    /// Get a company by ID
    #[napi]
    pub fn get_company(&self, id: String) -> Result<Option<CrmCompany>> {
        let companies = self.companies.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        companies.get(&id).map(|c| CrmCompany {
            id: c.id,
            name: c.name,
            website: c.website.clone(),
            industry: c.industry.clone(),
            tags: c.tags.clone(),
            notes: c.notes.clone(),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }).ok_or(None)
    }

    /// Remove a company
    #[napi]
    pub fn remove_company(&self, id: String) -> Result<()> {
        let mut companies = self.companies.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        companies.remove(&id);
        Ok(())
    }

    /// Get counts of all indexed entities
    #[napi]
    pub fn get_counts(&self) -> Result<CrmCounts> {
        let contacts = self.contacts.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        let deals = self.deals.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        let companies = self.companies.read()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        Ok(CrmCounts {
            contacts: contacts.len() as u32,
            deals: deals.len() as u32,
            companies: companies.len() as u32,
        })
    }

    /// Clear all indexes
    #[napi]
    pub fn clear(&self) -> Result<()> {
        let mut contacts = self.contacts.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        let mut deals = self.deals.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;
        let mut companies = self.companies.write()
            .map_err(|e| Error::from_reason(format!("Lock error: {}", e)))?;

        contacts.clear();
        deals.clear();
        companies.clear();
        Ok(())
    }
}

/// Contact input for indexing
#[napi(object)]
pub struct CrmContact {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub company: Option<String>,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Deal input for indexing
#[napi(object)]
pub struct CrmDeal {
    pub id: String,
    pub title: String,
    pub contact_id: String,
    pub value: f64,
    pub stage: String,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub expected_close: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Company input for indexing
#[napi(object)]
pub struct CrmCompany {
    pub id: String,
    pub name: String,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Entity counts result
#[napi(object)]
pub struct CrmCounts {
    pub contacts: u32,
    pub deals: u32,
    pub companies: u32,
}
