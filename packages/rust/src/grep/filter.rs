//! File filtering logic for grep

use std::path::Path;
use std::fs::Metadata;
use ignore::DirEntry;
use crate::grep::types::SearchConfig;

/// Configuration for file filtering
#[derive(Debug, Clone)]
pub struct FilterConfig {
    pub skip_binary: bool,
    pub max_filesize: Option<u64>,
    pub extensions: Vec<String>,
    pub skip_files: Vec<String>,
}

impl From<&SearchConfig> for FilterConfig {
    fn from(config: &SearchConfig) -> Self {
        Self {
            skip_binary: config.skip_binary,
            max_filesize: config.max_filesize,
            extensions: config.extensions.clone(),
            skip_files: config.skip_files.clone(),
        }
    }
}

/// File filter for determining which files to process
pub struct FileFilter {
    config: FilterConfig,
}

impl FileFilter {
    /// Create a new file filter
    pub fn new(config: &SearchConfig) -> Self {
        Self {
            config: FilterConfig::from(config),
        }
    }

    /// Check if a file should be processed
    pub fn should_process(&self, entry: &DirEntry) -> bool {
        let path = entry.path();

        // Check file extension
        if !self.config.extensions.is_empty() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !self.config.extensions.iter().any(|e| e == ext) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check skip files list
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if self.config.skip_files.contains(&name.to_string()) {
                return false;
            }
        }

        true
    }

    /// Check if a file should be processed given its path and optional metadata
    pub fn should_process_path(&self, path: &Path, metadata: Option<&Metadata>) -> bool {
        // Check file extension
        if !self.config.extensions.is_empty() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !self.config.extensions.iter().any(|e| e == ext) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check skip files list
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if self.config.skip_files.contains(&name.to_string()) {
                return false;
            }
        }

        // Check file size
        if let (Some(max_size), Some(meta)) = (self.config.max_filesize, metadata) {
            if meta.len() > max_size {
                return false;
            }
        }

        true
    }

    /// Check if content appears to be binary
    pub fn is_binary(&self, content: &[u8]) -> bool {
        if content.is_empty() {
            return false;
        }

        // Check for null bytes (common indicator of binary)
        if content.contains(&0x00) {
            return true;
        }

        // Check the first 8KB for binary content
        let check_len = content.len().min(8192);
        let sample = &content[..check_len];

        // Count non-text bytes
        let non_text_count = sample.iter().filter(|&&b| {
            // Control characters (except common whitespace)
            b < 0x20 && !matches!(b, b'\t' | b'\n' | b'\r')
        }).count();

        // If more than 30% non-text bytes, consider it binary
        let ratio = non_text_count as f64 / check_len as f64;
        ratio > 0.30
    }

    /// Check if a file should be processed with content inspection
    pub async fn should_process_content(&self, path: &Path) -> std::io::Result<bool> {
        if !self.config.skip_binary {
            return Ok(true);
        }

        // Read first 8KB to check for binary content
        let content = tokio::fs::read(path).await?;
        Ok(!self.is_binary(&content))
    }
}

/// Binary detection utilities
pub struct BinaryDetector;

impl BinaryDetector {
    /// Check if bytes represent binary content
    pub fn is_binary(bytes: &[u8]) -> bool {
        if bytes.is_empty() {
            return false;
        }

        // Check for null bytes
        if bytes.contains(&0x00) {
            return true;
        }

        // Check sample for non-text ratio
        let sample_len = bytes.len().min(8192);
        let sample = &bytes[..sample_len];

        let non_text = sample.iter().filter(|&&b| {
            (b < 0x20 && !matches!(b, b'\t' | b'\n' | b'\r')) || b > 0x7E
        }).count();

        (non_text as f64 / sample_len as f64) > 0.30
    }

    /// Check if bytes are valid UTF-8
    pub fn is_valid_utf8(bytes: &[u8]) -> bool {
        std::str::from_utf8(bytes).is_ok()
    }

    /// Detect file encoding heuristics
    pub fn detect_encoding(bytes: &[u8]) -> FileEncoding {
        if bytes.len() < 2 {
            return FileEncoding::Binary;
        }

        // Check BOM markers
        if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
            return FileEncoding::Utf8WithBom;
        }
        if bytes.starts_with(&[0xFF, 0xFE]) {
            return FileEncoding::Utf16Le;
        }
        if bytes.starts_with(&[0xFE, 0xFF]) {
            return FileEncoding::Utf16Be;
        }

        // Check for binary content
        if Self::is_binary(bytes) {
            return FileEncoding::Binary;
        }

        // Default to UTF-8
        FileEncoding::Utf8
    }
}

/// Detected file encoding
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileEncoding {
    Utf8,
    Utf8WithBom,
    Utf16Le,
    Utf16Be,
    Binary,
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_detection() {
        assert!(!BinaryDetector::is_binary(b"Hello, World!"));
        assert!(!BinaryDetector::is_binary(b"Line 1\nLine 2\n"));

        // Contains null byte
        assert!(BinaryDetector::is_binary(b"Hello\x00World"));

        // High ratio of control characters
        let binary_data: Vec<u8> = (0..100).map(|i| (i % 32) as u8).collect();
        assert!(BinaryDetector::is_binary(&binary_data));
    }

    #[test]
    fn test_encoding_detection() {
        assert_eq!(BinaryDetector::detect_encoding(b"Hello"), FileEncoding::Utf8);

        let utf8_bom = [0xEF, 0xBB, 0xBF, b'H', b'i'];
        assert_eq!(BinaryDetector::detect_encoding(&utf8_bom), FileEncoding::Utf8WithBom);

        let utf16_le = [0xFF, 0xFE, 0x48, 0x00];
        assert_eq!(BinaryDetector::detect_encoding(&utf16_le), FileEncoding::Utf16Le);
    }

    #[test]
    fn test_filter_extensions() {
        let mut config = SearchConfig::default();
        config.extensions = vec!["rs".to_string(), "ts".to_string()];

        let filter = FileFilter::new(&config);

        // Should pass .rs files
        assert!(filter.should_process_path(Path::new("test.rs"), None));
        assert!(filter.should_process_path(Path::new("test.ts"), None));

        // Should fail other extensions
        assert!(!filter.should_process_path(Path::new("test.js"), None));
        assert!(!filter.should_process_path(Path::new("test.py"), None));
    }
}
