//! File Index - Fast file watching and indexing
//!
//! Provides high-performance file system monitoring using native OS APIs:
//! - macOS: FSEvents via notify
//! - Linux: inotify via notify
//! - Windows: ReadDirectoryChangesW via notify

use napi::bindgen_prelude::*;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

// Import the Watcher trait for .watch() method
use notify::Watcher;

/// File metadata entry
#[napi(object)]
pub struct FileEntry {
    /// File path
    pub path: String,
    /// File size in bytes
    pub size: f64,
    /// Last modified time (ms since epoch)
    pub modified: f64,
    /// Whether this is a directory
    pub is_dir: bool,
    /// File extension (without dot)
    pub extension: Option<String>,
    /// File name
    pub name: String,
}

/// Options for directory scanning
#[napi(object)]
#[derive(Default)]
pub struct ScanOptions {
    /// Maximum depth to scan (None = unlimited)
    pub max_depth: Option<u32>,
    /// Glob patterns to include (e.g., ["*.ts", "*.rs"])
    pub include_patterns: Option<Vec<String>>,
    /// Glob patterns to exclude (e.g., ["node_modules", ".git"])
    pub exclude_patterns: Option<Vec<String>>,
    /// Follow symbolic links
    pub follow_symlinks: Option<bool>,
    /// Skip hidden files/directories
    pub skip_hidden: Option<bool>,
    /// Include directories in results
    pub include_dirs: Option<bool>,
    /// Maximum number of results
    pub limit: Option<u32>,
}

/// Result of directory scan
#[napi(object)]
pub struct ScanResult {
    /// List of file entries
    pub entries: Vec<FileEntry>,
    /// Total files found
    pub total_files: u32,
    /// Total directories found
    pub total_dirs: u32,
    /// Total size in bytes
    pub total_size: f64,
    /// Scan duration in milliseconds
    pub duration_ms: u32,
    /// Number of entries skipped
    pub skipped: u32,
}

/// Statistics for a directory
#[napi(object)]
pub struct DirectoryStats {
    /// Total file count
    pub file_count: u32,
    /// Total directory count
    pub dir_count: u32,
    /// Total size in bytes
    pub total_size: f64,
    /// File count by extension
    pub by_extension: HashMap<String, u32>,
    /// Largest files (path, size)
    pub largest_files: Vec<FileEntry>,
}

/// File event type for watching
#[derive(Clone, Copy, Debug)]
pub enum FileEventTypeInner {
    Add,
    Modify,
    Remove,
    Rename,
    Other,
}

/// A file system event
#[napi(object)]
pub struct FileEvent {
    /// Type of event: "add", "modify", "remove", "rename", "other"
    pub event_type: String,
    /// Absolute path to the file/directory
    pub path: String,
    /// Previous path (for rename events)
    pub old_path: Option<String>,
    /// Whether this is a directory
    pub is_dir: bool,
    /// Timestamp in milliseconds since epoch
    pub timestamp: f64,
}

impl FileEvent {
    fn from_notify(event_type: FileEventTypeInner, path: PathBuf, is_dir: bool) -> Self {
        let type_str = match event_type {
            FileEventTypeInner::Add => "add",
            FileEventTypeInner::Modify => "modify",
            FileEventTypeInner::Remove => "remove",
            FileEventTypeInner::Rename => "rename",
            FileEventTypeInner::Other => "other",
        };

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);

        FileEvent {
            event_type: type_str.to_string(),
            path: path.to_string_lossy().to_string(),
            old_path: None,
            is_dir,
            timestamp,
        }
    }
}

/// Watcher handle for managing file watch
#[napi]
pub struct FileWatcher {
    watcher: Option<Arc<Mutex<notify::RecommendedWatcher>>>,
    path: PathBuf,
    event_rx: Option<Arc<Mutex<crossbeam_channel::Receiver<FileEvent>>>>,
}

#[napi]
impl FileWatcher {
    /// Stop watching the directory
    #[napi]
    pub fn stop(&mut self) -> Result<()> {
        if let Some(watcher) = self.watcher.take() {
            let mut w = watcher.lock().map_err(|e| Error::from_reason(e.to_string()))?;
            let _ = w.unwatch(&self.path);
        }
        Ok(())
    }

    /// Get the watched path
    #[napi]
    pub fn get_path(&self) -> String {
        self.path.to_string_lossy().to_string()
    }

    /// Poll for events (non-blocking)
    /// Returns all pending events, empty vec if none
    #[napi]
    pub fn poll_events(&self, env: Env) -> Result<Vec<FileEvent>> {
        let _ = env; // Use env to satisfy napi
        let rx = self
            .event_rx
            .as_ref()
            .ok_or_else(|| Error::from_reason("Watcher not active".to_string()))?;

        let rx = rx.lock().map_err(|e| Error::from_reason(e.to_string()))?;
        let mut events = Vec::new();

        while let Ok(event) = rx.try_recv() {
            events.push(event);
        }

        Ok(events)
    }
}

/// Fast directory scan
///
/// Scans a directory and returns all files matching the options.
/// Uses walkdir for efficient parallel traversal.
#[napi]
pub fn scan_directory(path: String, options: Option<ScanOptions>) -> Result<ScanResult> {
    let start = Instant::now();
    let opts = options.unwrap_or_default();
    let root = Path::new(&path);

    if !root.exists() {
        return Err(Error::from_reason(format!("Path does not exist: {}", path)));
    }

    let max_depth = opts.max_depth.map(|d| d as usize).unwrap_or(usize::MAX);
    let follow_links = opts.follow_symlinks.unwrap_or(false);
    let skip_hidden = opts.skip_hidden.unwrap_or(true);
    let include_dirs = opts.include_dirs.unwrap_or(false);
    let limit = opts.limit.unwrap_or(u32::MAX) as usize;

    // Compile exclude patterns
    let exclude_patterns: Vec<glob::Pattern> = opts
        .exclude_patterns
        .unwrap_or_default()
        .iter()
        .filter_map(|p| glob::Pattern::new(p).ok())
        .collect();

    // Compile include patterns (empty = all)
    let include_patterns: Vec<glob::Pattern> = opts
        .include_patterns
        .unwrap_or_default()
        .iter()
        .filter_map(|p| glob::Pattern::new(p).ok())
        .collect();

    let mut entries = Vec::new();
    let mut total_files = 0u32;
    let mut total_dirs = 0u32;
    let mut total_size = 0u64;
    let mut skipped = 0u32;

    for entry_result in WalkDir::new(root)
        .max_depth(max_depth)
        .follow_links(follow_links)
        .into_iter()
    {
        if entries.len() >= limit {
            skipped += 1;
            continue;
        }

        let entry = match entry_result {
            Ok(e) => e,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };

        let path = entry.path();
        let path_str = path.to_string_lossy();
        let file_name = entry.file_name().to_string_lossy();

        // Skip hidden files
        if skip_hidden && file_name.starts_with('.') {
            continue;
        }

        // Check exclude patterns
        let path_string = path_str.to_string();
        if exclude_patterns.iter().any(|p| p.matches(&path_string)) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };

        let is_dir = metadata.is_dir();

        // Skip directories unless include_dirs is true
        if is_dir && !include_dirs {
            continue;
        }

        // Check include patterns (only for files)
        if !is_dir && !include_patterns.is_empty() {
            if !include_patterns.iter().any(|p| p.matches(&path_string)) {
                continue;
            }
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);

        let size = metadata.len();
        let extension = path.extension().map(|e| e.to_string_lossy().to_string());

        if is_dir {
            total_dirs += 1;
        } else {
            total_files += 1;
            total_size += size;
        }

        entries.push(FileEntry {
            path: path_string,
            size: size as f64,
            modified,
            is_dir,
            extension,
            name: file_name.to_string(),
        });
    }

    Ok(ScanResult {
        entries,
        total_files,
        total_dirs,
        total_size: total_size as f64,
        duration_ms: start.elapsed().as_millis() as u32,
        skipped,
    })
}

/// Get directory statistics (file counts by extension, total size, etc.)
#[napi]
pub fn get_directory_stats(path: String, max_depth: Option<u32>) -> Result<DirectoryStats> {
    let root = Path::new(&path);

    if !root.exists() {
        return Err(Error::from_reason(format!("Path does not exist: {}", path)));
    }

    let mut file_count = 0u32;
    let mut dir_count = 0u32;
    let mut total_size = 0u64;
    let mut by_extension: HashMap<String, u32> = HashMap::new();
    let mut all_files: Vec<FileEntry> = Vec::new();

    let depth = max_depth.map(|d| d as usize).unwrap_or(usize::MAX);

    for entry_result in WalkDir::new(root).max_depth(depth).into_iter() {
        let entry = match entry_result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            dir_count += 1;
            continue;
        }

        file_count += 1;
        let size = metadata.len();
        total_size += size;

        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            *by_extension.entry(ext.to_string()).or_insert(0) += 1;
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);

        all_files.push(FileEntry {
            path: path.to_string_lossy().to_string(),
            size: size as f64,
            modified,
            is_dir: false,
            extension: path.extension().map(|e| e.to_string_lossy().to_string()),
            name: entry.file_name().to_string_lossy().to_string(),
        });
    }

    // Sort by size and take top 10 largest
    all_files.sort_by(|a, b| b.size.partial_cmp(&a.size).unwrap_or(std::cmp::Ordering::Equal));
    let largest_files: Vec<FileEntry> = all_files.into_iter().take(10).collect();

    Ok(DirectoryStats {
        file_count,
        dir_count,
        total_size: total_size as f64,
        by_extension,
        largest_files,
    })
}

/// Check if a path has changed since a given timestamp
#[napi]
pub fn has_changed(path: String, since_ms: f64) -> Result<bool> {
    let p = Path::new(&path);

    if !p.exists() {
        return Ok(true); // Non-existent = changed
    }

    let metadata = p.metadata().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified = metadata.modified().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified_ms = modified
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0);

    Ok(modified_ms > since_ms)
}

/// Get file hash (quick xxHash3)
#[napi]
pub fn get_file_hash(path: String) -> Result<String> {
    use std::io::Read;
    use xxhash_rust::xxh3::Xxh3;

    let mut file =
        std::fs::File::open(&path).map_err(|e| Error::from_reason(format!("Failed to open: {}", e)))?;

    let mut hasher = Xxh3::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(format!("{:016x}", hasher.digest()))
}

/// Quick file existence check
#[napi]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Quick directory check
#[napi]
pub fn is_directory(path: String) -> bool {
    Path::new(&path).is_dir()
}

/// Get file size in bytes
#[napi]
pub fn get_file_size(path: String) -> Result<f64> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| Error::from_reason(format!("Failed to get metadata: {}", e)))?;
    Ok(metadata.len() as f64)
}

/// Get last modified time in ms since epoch
#[napi]
pub fn get_modified_time(path: String) -> Result<f64> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| Error::from_reason(format!("Failed to get metadata: {}", e)))?;

    let modified = metadata.modified().map_err(|e| Error::from_reason(e.to_string()))?;

    Ok(modified
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0))
}

/// Find files by pattern (glob)
#[napi]
pub fn find_files(pattern: String, base_path: Option<String>) -> Result<Vec<String>> {
    let base = base_path.unwrap_or_else(|| ".".to_string());
    let full_pattern = if pattern.starts_with('/') {
        pattern
    } else {
        format!("{}/{}", base, pattern)
    };

    let paths: Vec<String> = glob::glob(&full_pattern)
        .map_err(|e| Error::from_reason(format!("Invalid pattern: {}", e)))?
        .filter_map(|r| r.ok())
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    Ok(paths)
}

/// List files in a directory (non-recursive)
#[napi]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>> {
    let dir = Path::new(&path);

    if !dir.exists() {
        return Err(Error::from_reason(format!("Path does not exist: {}", path)));
    }

    if !dir.is_dir() {
        return Err(Error::from_reason(format!("Not a directory: {}", path)));
    }

    let mut entries = Vec::new();

    let read_dir = std::fs::read_dir(dir)
        .map_err(|e| Error::from_reason(format!("Failed to read directory: {}", e)))?;

    for entry_result in read_dir {
        let entry = entry_result.map_err(|e| Error::from_reason(e.to_string()))?;

        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| Error::from_reason(e.to_string()))?;

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);

        entries.push(FileEntry {
            path: path.to_string_lossy().to_string(),
            size: metadata.len() as f64,
            modified,
            is_dir: metadata.is_dir(),
            extension: path.extension().map(|e| e.to_string_lossy().to_string()),
            name: entry.file_name().to_string_lossy().to_string(),
        });
    }

    Ok(entries)
}

/// Watch a directory for changes
///
/// Returns a FileWatcher that can be polled for events.
#[napi]
pub fn watch_directory(path: String) -> Result<FileWatcher> {
    let root = PathBuf::from(&path);

    if !root.exists() {
        return Err(Error::from_reason(format!("Path does not exist: {}", path)));
    }

    // Create channel for events
    let (tx, rx) = crossbeam_channel::unbounded();

    // Create watcher
    let watcher = notify::RecommendedWatcher::new(
        move |res: std::result::Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    notify::EventKind::Create(_) => FileEventTypeInner::Add,
                    notify::EventKind::Modify(_) => FileEventTypeInner::Modify,
                    notify::EventKind::Remove(_) => FileEventTypeInner::Remove,
                    notify::EventKind::Access(_) => FileEventTypeInner::Other,
                    _ => FileEventTypeInner::Other,
                };

                for path in event.paths {
                    let is_dir = path.is_dir();
                    let file_event = FileEvent::from_notify(event_type, path, is_dir);
                    let _ = tx.send(file_event);
                }
            }
            // Silently ignore errors in the callback - they're logged internally by notify
        },
        notify::Config::default(),
    )
    .map_err(|e| Error::from_reason(format!("Failed to create watcher: {}", e)))?;

    let watcher = Arc::new(Mutex::new(watcher));

    // Start watching
    {
        let mut w = watcher
            .lock()
            .map_err(|e| Error::from_reason(e.to_string()))?;
        w.watch(&root, notify::RecursiveMode::Recursive)
            .map_err(|e| Error::from_reason(format!("Failed to start watching: {}", e)))?;
    }

    Ok(FileWatcher {
        watcher: Some(watcher),
        path: root,
        event_rx: Some(Arc::new(Mutex::new(rx))),
    })
}
