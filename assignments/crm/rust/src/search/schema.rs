//! Tantivy schema definition for CRM entities

use tantivy::schema::*;

/// Create the schema for CRM search index
pub fn create_crm_schema() -> Schema {
    let mut schema_builder = Schema::builder();

    // Common fields
    schema_builder.add_text_field("id", STRING | STORED);
    schema_builder.add_text_field("entity_type", STRING | STORED | FAST);

    // Contact fields
    schema_builder.add_text_field("name", TEXT | STORED);
    schema_builder.add_text_field("email", TEXT | STORED);
    schema_builder.add_text_field("company", TEXT | STORED);
    schema_builder.add_text_field("title", TEXT | STORED);
    schema_builder.add_text_field("contact_notes", TEXT);

    // Deal fields
    schema_builder.add_text_field("deal_title", TEXT | STORED);
    schema_builder.add_text_field("contact_id", STRING | STORED);
    schema_builder.add_f64_field("deal_value", STORED | FAST);
    schema_builder.add_text_field("stage", STRING | STORED | FAST);
    schema_builder.add_text_field("deal_notes", TEXT);

    // Company fields
    schema_builder.add_text_field("company_name", TEXT | STORED);
    schema_builder.add_text_field("website", TEXT | STORED);
    schema_builder.add_text_field("industry", STRING | STORED | FAST);
    schema_builder.add_text_field("company_notes", TEXT);

    // Shared fields
    schema_builder.add_text_field("tags", TEXT | STORED);
    schema_builder.add_text_field("all_text", TEXT); // Catch-all for search

    // Timestamps
    schema_builder.add_i64_field("created_at", STORED | FAST);
    schema_builder.add_i64_field("updated_at", STORED | FAST);

    schema_builder.build()
}

/// Field names for easy access
pub struct CrmFields {
    pub id: Field,
    pub entity_type: Field,
    pub name: Field,
    pub email: Field,
    pub company: Field,
    pub title: Field,
    pub contact_notes: Field,
    pub deal_title: Field,
    pub contact_id: Field,
    pub deal_value: Field,
    pub stage: Field,
    pub deal_notes: Field,
    pub company_name: Field,
    pub website: Field,
    pub industry: Field,
    pub company_notes: Field,
    pub tags: Field,
    pub all_text: Field,
    pub created_at: Field,
    pub updated_at: Field,
}

impl CrmFields {
    pub fn from_schema(schema: &Schema) -> Self {
        Self {
            id: schema.get_field("id").unwrap(),
            entity_type: schema.get_field("entity_type").unwrap(),
            name: schema.get_field("name").unwrap(),
            email: schema.get_field("email").unwrap(),
            company: schema.get_field("company").unwrap(),
            title: schema.get_field("title").unwrap(),
            contact_notes: schema.get_field("contact_notes").unwrap(),
            deal_title: schema.get_field("deal_title").unwrap(),
            contact_id: schema.get_field("contact_id").unwrap(),
            deal_value: schema.get_field("deal_value").unwrap(),
            stage: schema.get_field("stage").unwrap(),
            deal_notes: schema.get_field("deal_notes").unwrap(),
            company_name: schema.get_field("company_name").unwrap(),
            website: schema.get_field("website").unwrap(),
            industry: schema.get_field("industry").unwrap(),
            company_notes: schema.get_field("company_notes").unwrap(),
            tags: schema.get_field("tags").unwrap(),
            all_text: schema.get_field("all_text").unwrap(),
            created_at: schema.get_field("created_at").unwrap(),
            updated_at: schema.get_field("updated_at").unwrap(),
        }
    }
}
