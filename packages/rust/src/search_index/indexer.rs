//! Index operations - add, update, delete documents

use tantivy::IndexWriter;
use tantivy::schema::Schema;
use tantivy::TantivyDocument;
use napi::Error;
use chrono::Utc;

use super::schema::*;
use super::SymbolInfo;

/// Add a file to the search index
pub fn add_file_to_index(
    writer: &mut IndexWriter<TantivyDocument>,
    schema: &Schema,
    path: &str,
    content: &str,
    language: Option<&str>,
    symbols: Option<&Vec<SymbolInfo>>,
) -> Result<(), Error> {
    let fields = CodeSchemaFields::from_schema(schema);

    // Extract metadata
    let directory = extract_directory(path);
    let filename = extract_filename(path);
    let detected_lang = language.map(|s| s.to_string())
        .or_else(|| language_from_path(path));

    // Count lines and size
    let line_count = content.lines().count() as i64;
    let size = content.len() as i64;

    // Build symbol text for search
    let symbol_text = symbols
        .map(|syms| syms.iter().map(|s| s.name.as_str()).collect::<Vec<_>>().join(" "))
        .unwrap_or_default();

    // Build symbol definitions JSON
    let symbol_defs = symbols
        .map(|syms| serde_json::to_string(syms).unwrap_or_default())
        .unwrap_or_default();

    // Extract imports
    let imports = extract_imports(content);

    // Build combined text for general search
    let all_text = format!(
        "{} {} {} {} {}",
        path, filename, content, symbol_text, imports
    );

    // Create document
    let mut document = TantivyDocument::new();

    // Primary fields
    document.add_text(fields.path, path);
    document.add_text(fields.directory, &directory);
    document.add_text(fields.filename, &filename);

    if let Some(lang) = &detected_lang {
        document.add_text(fields.language, lang);
    }

    // Content fields
    document.add_text(fields.content, content);
    document.add_text(fields.content_ngrams, content);

    // Symbol fields
    document.add_text(fields.symbols, &symbol_text);
    document.add_text(fields.symbol_defs, &symbol_defs);

    // Import/export fields
    document.add_text(fields.imports, &imports);

    // Metadata
    document.add_i64(fields.modified_at, Utc::now().timestamp());
    document.add_i64(fields.size, size);
    document.add_i64(fields.line_count, line_count);

    // Combined search field
    document.add_text(fields.all_text, &all_text);

    // Delete old document if exists (by path)
    delete_file_from_index_raw(writer, schema, path)?;

    // Add new document
    writer.add_document(document).map_err(|e| Error::from_reason(e.to_string()))?;

    Ok(())
}

/// Delete a file from the index (with commit)
pub fn delete_file_from_index(
    writer: &mut IndexWriter<TantivyDocument>,
    schema: &Schema,
    path: &str,
) -> Result<(), Error> {
    delete_file_from_index_raw(writer, schema, path)?;
    writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(())
}

/// Internal delete without commit
fn delete_file_from_index_raw(
    writer: &mut IndexWriter<TantivyDocument>,
    schema: &Schema,
    path: &str,
) -> Result<(), Error> {
    let path_field = schema.get_field("path").map_err(|e| Error::from_reason(e.to_string()))?;

    // Delete by path term
    let term = tantivy::Term::from_field_text(path_field, path);
    writer.delete_term(term);

    Ok(())
}

/// Extract import statements from code
fn extract_imports(content: &str) -> String {
    let mut imports = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // JavaScript/TypeScript imports
        if trimmed.starts_with("import ") || trimmed.starts_with("export ") {
            imports.push(trimmed.to_string());
        }

        // Python imports
        if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
            imports.push(trimmed.to_string());
        }

        // Rust imports
        if trimmed.starts_with("use ") {
            imports.push(trimmed.to_string());
        }

        // Go imports (handled differently but include for completeness)
        if trimmed.starts_with("import ") {
            imports.push(trimmed.to_string());
        }

        // C/C++ includes
        if trimmed.starts_with("#include") {
            imports.push(trimmed.to_string());
        }
    }

    imports.join(" ")
}

/// Index a directory of files
pub fn index_directory(
    writer: &mut IndexWriter<TantivyDocument>,
    schema: &Schema,
    dir_path: &str,
    extensions: Option<&[&str]>,
) -> Result<usize, Error> {
    use std::fs;
    use std::path::Path;

    let path = Path::new(dir_path);
    let mut count = 0;

    fn process_dir(
        dir: &Path,
        writer: &mut IndexWriter<TantivyDocument>,
        schema: &Schema,
        extensions: Option<&[&str]>,
        count: &mut usize,
    ) -> Result<(), Error> {
        let entries = fs::read_dir(dir).map_err(|e| Error::from_reason(e.to_string()))?;

        for entry in entries {
            let entry = entry.map_err(|e| Error::from_reason(e.to_string()))?;
            let path = entry.path();

            if path.is_dir() {
                // Skip hidden and common ignore directories
                let name = path.file_name()
                    .map(|n| n.to_string_lossy())
                    .unwrap_or_default();

                let should_skip = name.starts_with('.')
                    || matches!(name.as_ref(), "node_modules" | "target" | "dist" | "build" | ".git" | "vendor");

                if !should_skip {
                    process_dir(&path, writer, schema, extensions, count)?;
                }
            } else if path.is_file() {
                // Check extension
                let ext = path.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("");

                if let Some(exts) = extensions {
                    if !exts.contains(&ext) {
                        continue;
                    }
                }

                // Read and index
                if let Ok(content) = fs::read_to_string(&path) {
                    let path_str = path.to_string_lossy();
                    add_file_to_index(writer, schema, &path_str, &content, None, None)?;
                    *count += 1;
                }
            }
        }
        Ok(())
    }

    process_dir(path, writer, schema, extensions, &mut count)?;
    writer.commit().map_err(|e| Error::from_reason(e.to_string()))?;

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_imports() {
        let code = r#"
import React from 'react';
import { useState } from 'react';
use std::collections::HashMap;
from typing import List, Dict
"#;
        let imports = extract_imports(code);
        assert!(imports.contains("import React"));
        assert!(imports.contains("use std"));
        assert!(imports.contains("from typing"));
    }
}
