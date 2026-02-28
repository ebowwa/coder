//! Atomic multi-file editing with rollback support
//!
//! This module provides atomic operations for editing multiple files simultaneously.
//! If any edit fails, all changes are rolled back to maintain consistency.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use anyhow::{Result, bail};

/// A single edit operation
#[derive(Debug, Clone)]
pub struct FileEdit {
    pub file_path: PathBuf,
    pub old_string: String,
    pub new_string: String,
    pub replace_all: bool,
}

/// Result of validating edits
#[derive(Debug)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub file_contents: HashMap<PathBuf, String>,
}

/// Result of an atomic edit operation
#[derive(Debug, Clone)]
pub struct AtomicEditResult {
    pub success: bool,
    pub files_modified: Vec<String>,
    pub total_replacements: u32,
    pub error: Option<String>,
    pub rolled_back: bool,
}

/// Backup entry for rollback
#[derive(Debug)]
struct BackupEntry {
    path: PathBuf,
    original_content: String,
}

/// Validate all edits before applying them
pub fn validate_edits(edits: &[FileEdit]) -> ValidationResult {
    let mut errors = Vec::new();
    let mut file_contents: HashMap<PathBuf, String> = HashMap::new();

    for edit in edits {
        // Check file exists
        if !edit.file_path.exists() {
            errors.push(format!(
                "File not found: {}",
                edit.file_path.display()
            ));
            continue;
        }

        // Load file content if not already loaded
        let content = match file_contents.entry(edit.file_path.clone()) {
            std::collections::hash_map::Entry::Occupied(e) => e.get().clone(),
            std::collections::hash_map::Entry::Vacant(e) => {
                match fs::read_to_string(&edit.file_path) {
                    Ok(c) => e.insert(c).clone(),
                    Err(err) => {
                        errors.push(format!(
                            "Failed to read file {}: {}",
                            edit.file_path.display(),
                            err
                        ));
                        continue;
                    }
                }
            }
        };

        // Check old_string exists
        if !content.contains(&edit.old_string) {
            errors.push(format!(
                "String not found in {}: {:?}",
                edit.file_path.display(),
                truncate_string(&edit.old_string, 50)
            ));
            continue;
        }

        // Check uniqueness if not replace_all
        if !edit.replace_all {
            let count = content.matches(&edit.old_string).count();
            if count > 1 {
                errors.push(format!(
                    "String appears {} times in {}. Use replace_all or provide more context.",
                    count,
                    edit.file_path.display()
                ));
            }
        }
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
        file_contents,
    }
}

/// Apply edits atomically with rollback on failure
pub fn apply_edits_atomically(edits: &[FileEdit]) -> AtomicEditResult {
    // First, validate all edits
    let validation = validate_edits(edits);

    if !validation.valid {
        return AtomicEditResult {
            success: false,
            files_modified: vec![],
            total_replacements: 0,
            error: Some(validation.errors.join("\n")),
            rolled_back: false,
        };
    }

    // Create backups
    let mut backups: Vec<BackupEntry> = Vec::new();
    let mut files_to_backup: HashMap<PathBuf, String> = HashMap::new();

    // Collect unique files and their contents
    for edit in edits {
        if !files_to_backup.contains_key(&edit.file_path) {
            if let Some(content) = validation.file_contents.get(&edit.file_path) {
                files_to_backup.insert(edit.file_path.clone(), content.clone());
            }
        }
    }

    // Create backups for all unique files
    for (path, content) in &files_to_backup {
        backups.push(BackupEntry {
            path: path.clone(),
            original_content: content.clone(),
        });
    }

    // Apply edits
    let mut files_modified = Vec::new();
    let mut total_replacements = 0u32;
    let mut current_contents: HashMap<PathBuf, String> = files_to_backup.clone();

    for edit in edits {
        if let Some(content) = current_contents.get_mut(&edit.file_path) {
            if edit.replace_all {
                let count = content.matches(&edit.old_string).count() as u32;
                *content = content.replace(&edit.old_string, &edit.new_string);
                total_replacements += count;
            } else {
                *content = content.replacen(&edit.old_string, &edit.new_string, 1);
                total_replacements += 1;
            }
        }
    }

    // Write all modified files
    for (path, content) in &current_contents {
        if let Some(original) = files_to_backup.get(path) {
            // Only write if content changed
            if content != original {
                match fs::write(path, content) {
                    Ok(()) => {
                        files_modified.push(path.display().to_string());
                    }
                    Err(err) => {
                        // Rollback on write failure
                        let _ = rollback(&backups);
                        return AtomicEditResult {
                            success: false,
                            files_modified: vec![],
                            total_replacements: 0,
                            error: Some(format!(
                                "Failed to write {}: {}. All changes rolled back.",
                                path.display(),
                                err
                            )),
                            rolled_back: true,
                        };
                    }
                }
            }
        }
    }

    AtomicEditResult {
        success: true,
        files_modified,
        total_replacements,
        error: None,
        rolled_back: false,
    }
}

/// Rollback changes by restoring from backups
fn rollback(backups: &[BackupEntry]) -> Result<()> {
    let mut errors = Vec::new();

    for backup in backups {
        if let Err(err) = fs::write(&backup.path, &backup.original_content) {
            errors.push(format!(
                "Failed to restore {}: {}",
                backup.path.display(),
                err
            ));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        bail!("Rollback errors: {}", errors.join("; "))
    }
}

/// Preview what edits would be applied without making changes
pub fn preview_edits(edits: &[FileEdit]) -> Result<Vec<(PathBuf, u32)>> {
    let validation = validate_edits(edits);

    if !validation.valid {
        bail!("Validation failed: {}", validation.errors.join("; "));
    }

    let mut results = Vec::new();
    let mut file_replacements: HashMap<PathBuf, u32> = HashMap::new();

    for edit in edits {
        let count = if edit.replace_all {
            validation.file_contents
                .get(&edit.file_path)
                .map(|c| c.matches(&edit.old_string).count() as u32)
                .unwrap_or(0)
        } else {
            1
        };

        *file_replacements.entry(edit.file_path.clone()).or_insert(0) += count;
    }

    for (path, count) in file_replacements {
        results.push((path, count));
    }

    Ok(results)
}

/// Truncate a string for display in error messages
fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_validate_edits_missing_file() {
        let edits = vec![FileEdit {
            file_path: PathBuf::from("/nonexistent/file.txt"),
            old_string: "old".to_string(),
            new_string: "new".to_string(),
            replace_all: false,
        }];

        let result = validate_edits(&edits);
        assert!(!result.valid);
        assert!(result.errors[0].contains("File not found"));
    }

    #[test]
    fn test_validate_edits_string_not_found() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "hello world").unwrap();

        let edits = vec![FileEdit {
            file_path: file_path.clone(),
            old_string: "goodbye".to_string(),
            new_string: "new".to_string(),
            replace_all: false,
        }];

        let result = validate_edits(&edits);
        assert!(!result.valid);
        assert!(result.errors[0].contains("String not found"));
    }

    #[test]
    fn test_validate_edits_multiple_occurrences() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "foo bar foo").unwrap();

        let edits = vec![FileEdit {
            file_path: file_path.clone(),
            old_string: "foo".to_string(),
            new_string: "baz".to_string(),
            replace_all: false,
        }];

        let result = validate_edits(&edits);
        assert!(!result.valid);
        assert!(result.errors[0].contains("appears 2 times"));
    }

    #[test]
    fn test_apply_edits_atomically_success() {
        let dir = tempdir().unwrap();
        let file1 = dir.path().join("file1.txt");
        let file2 = dir.path().join("file2.txt");

        fs::write(&file1, "hello world").unwrap();
        fs::write(&file2, "foo bar").unwrap();

        let edits = vec![
            FileEdit {
                file_path: file1.clone(),
                old_string: "hello".to_string(),
                new_string: "hi".to_string(),
                replace_all: false,
            },
            FileEdit {
                file_path: file2.clone(),
                old_string: "bar".to_string(),
                new_string: "baz".to_string(),
                replace_all: false,
            },
        ];

        let result = apply_edits_atomically(&edits);
        assert!(result.success);
        assert_eq!(result.files_modified.len(), 2);
        assert_eq!(result.total_replacements, 2);

        // Verify content
        assert_eq!(fs::read_to_string(&file1).unwrap(), "hi world");
        assert_eq!(fs::read_to_string(&file2).unwrap(), "foo baz");
    }

    #[test]
    fn test_apply_edits_replace_all() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        fs::write(&file, "foo foo foo").unwrap();

        let edits = vec![FileEdit {
            file_path: file.clone(),
            old_string: "foo".to_string(),
            new_string: "bar".to_string(),
            replace_all: true,
        }];

        let result = apply_edits_atomically(&edits);
        assert!(result.success);
        assert_eq!(result.total_replacements, 3);
        assert_eq!(fs::read_to_string(&file).unwrap(), "bar bar bar");
    }

    #[test]
    fn test_apply_edits_same_file_multiple_edits() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        fs::write(&file, "a b c d").unwrap();

        let edits = vec![
            FileEdit {
                file_path: file.clone(),
                old_string: "a".to_string(),
                new_string: "1".to_string(),
                replace_all: false,
            },
            FileEdit {
                file_path: file.clone(),
                old_string: "b".to_string(),
                new_string: "2".to_string(),
                replace_all: false,
            },
            FileEdit {
                file_path: file.clone(),
                old_string: "c".to_string(),
                new_string: "3".to_string(),
                replace_all: false,
            },
        ];

        let result = apply_edits_atomically(&edits);
        assert!(result.success);
        assert_eq!(result.total_replacements, 3);
        assert_eq!(fs::read_to_string(&file).unwrap(), "1 2 3 d");
    }
}
