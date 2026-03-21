//! Schema definition for code search index

use tantivy::schema::*;

/// Create the schema for code search index
pub fn create_code_schema() -> Schema {
    let mut schema_builder = Schema::builder();

    // === Primary Fields ===

    // File path (exact match, stored for retrieval)
    schema_builder.add_text_field("path", STRING | STORED);

    // Directory for filtering (e.g., "src/components")
    schema_builder.add_text_field("directory", STRING | FAST);

    // File name without path (for quick lookups)
    schema_builder.add_text_field("filename", TEXT | STORED);

    // Language/file type (ts, rs, py, etc.)
    schema_builder.add_text_field("language", STRING | FAST | STORED);

    // === Content Fields ===

    // Full file content (BM25 indexed)
    schema_builder.add_text_field("content", TEXT);

    // Content ngrams for fuzzy/partial matching
    schema_builder.add_text_field("content_ngrams", TEXT);

    // === Symbol Fields ===

    // Symbol names (function, class, method names)
    // Indexed for exact and fuzzy matching
    schema_builder.add_text_field("symbols", TEXT | STORED);

    // Symbol definitions as JSON array
    // [{name, kind, line, column}]
    schema_builder.add_text_field("symbol_defs", STORED);

    // === Import/Dependency Fields ===

    // Import statements for dependency tracking
    schema_builder.add_text_field("imports", TEXT);

    // Exported symbols (public API)
    schema_builder.add_text_field("exports", TEXT);

    // === Metadata Fields ===

    // File modification timestamp (for incremental updates)
    schema_builder.add_i64_field("modified_at", FAST | STORED);

    // File size in bytes
    schema_builder.add_i64_field("size", STORED);

    // Line count
    schema_builder.add_i64_field("line_count", STORED);

    // Git status (modified, added, untracked)
    schema_builder.add_text_field("git_status", STRING | FAST);

    // === Combined Search Fields ===

    // All searchable text combined (for general queries)
    schema_builder.add_text_field("all_text", TEXT);

    schema_builder.build()
}

/// Field accessors for the code schema
pub struct CodeSchemaFields {
    pub path: Field,
    pub directory: Field,
    pub filename: Field,
    pub language: Field,
    pub content: Field,
    pub content_ngrams: Field,
    pub symbols: Field,
    pub symbol_defs: Field,
    pub imports: Field,
    pub exports: Field,
    pub modified_at: Field,
    pub size: Field,
    pub line_count: Field,
    pub git_status: Field,
    pub all_text: Field,
}

impl CodeSchemaFields {
    pub fn from_schema(schema: &Schema) -> Self {
        Self {
            path: schema.get_field("path").unwrap(),
            directory: schema.get_field("directory").unwrap(),
            filename: schema.get_field("filename").unwrap(),
            language: schema.get_field("language").unwrap(),
            content: schema.get_field("content").unwrap(),
            content_ngrams: schema.get_field("content_ngrams").unwrap(),
            symbols: schema.get_field("symbols").unwrap(),
            symbol_defs: schema.get_field("symbol_defs").unwrap(),
            imports: schema.get_field("imports").unwrap(),
            exports: schema.get_field("exports").unwrap(),
            modified_at: schema.get_field("modified_at").unwrap(),
            size: schema.get_field("size").unwrap(),
            line_count: schema.get_field("line_count").unwrap(),
            git_status: schema.get_field("git_status").unwrap(),
            all_text: schema.get_field("all_text").unwrap(),
        }
    }
}

/// Extract directory from path
pub fn extract_directory(path: &str) -> String {
    let path = std::path::Path::new(path);
    path.parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Extract filename from path
pub fn extract_filename(path: &str) -> String {
    let path = std::path::Path::new(path);
    path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Extract language from file extension
pub fn language_from_path(path: &str) -> Option<String> {
    let path = std::path::Path::new(path);
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| match ext {
            "ts" | "tsx" => "typescript",
            "js" | "jsx" => "javascript",
            "mjs" | "cjs" => "javascript",
            "py" => "python",
            "rs" => "rust",
            "go" => "go",
            "java" => "java",
            "kt" => "kotlin",
            "rb" => "ruby",
            "php" => "php",
            "c" | "h" => "c",
            "cpp" | "cc" | "cxx" | "hpp" | "hxx" => "cpp",
            "cs" => "csharp",
            "swift" => "swift",
            "json" => "json",
            "yaml" | "yml" => "yaml",
            "md" => "markdown",
            "html" | "htm" => "html",
            "css" => "css",
            "scss" | "sass" => "scss",
            "sql" => "sql",
            "sh" | "bash" | "zsh" => "shell",
            "toml" => "toml",
            "xml" => "xml",
            _ => ext,
        })
        .map(|s| s.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_creation() {
        let schema = create_code_schema();
        assert!(schema.get_field("path").is_ok());
        assert!(schema.get_field("content").is_ok());
        assert!(schema.get_field("symbols").is_ok());
    }

    #[test]
    fn test_directory_extraction() {
        assert_eq!(extract_directory("src/components/Button.tsx"), "src/components");
        assert_eq!(extract_directory("README.md"), "");
    }

    #[test]
    fn test_language_detection() {
        assert_eq!(language_from_path("src/index.ts"), Some("typescript".to_string()));
        assert_eq!(language_from_path("lib.rs"), Some("rust".to_string()));
        assert_eq!(language_from_path("app.py"), Some("python".to_string()));
    }
}
