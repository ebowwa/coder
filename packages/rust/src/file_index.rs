//! File Index - Fast file watching, indexing, and analysis
//!
//! Provides high-performance file system operations:
//! - Directory scanning with gitignore support
//! - File watching with debouncing
//! - Content indexing with symbol extraction
//! - Duplicate detection
//! - Index persistence (save/load)
//! - Magic byte detection
//! - Disk usage treemap
//! - Parallel hashing

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;
use notify::Watcher;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/// File metadata entry
#[napi(object)]
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub size: f64,
    pub modified: f64,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
}

/// Options for directory scanning
#[napi(object)]
#[derive(Default, Clone)]
pub struct ScanOptions {
    pub max_depth: Option<u32>,
    pub include_patterns: Option<Vec<String>>,
    pub exclude_patterns: Option<Vec<String>>,
    pub follow_symlinks: Option<bool>,
    pub skip_hidden: Option<bool>,
    pub include_dirs: Option<bool>,
    pub limit: Option<u32>,
    pub compute_hashes: Option<bool>,
}

#[napi(object)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ScanResult {
    pub entries: Vec<FileEntry>,
    pub total_files: u32,
    pub total_dirs: u32,
    pub total_size: f64,
    pub duration_ms: u32,
    pub skipped: u32,
}

#[napi(object)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct DirectoryStats {
    pub file_count: u32,
    pub dir_count: u32,
    pub total_size: f64,
    pub by_extension: HashMap<String, u32>,
    pub largest_files: Vec<FileEntry>,
}

#[derive(Clone, Copy, Debug)]
pub enum FileEventTypeInner {
    Add,
    Modify,
    Remove,
    Rename,
    Other,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct FileEvent {
    pub event_type: String,
    pub path: String,
    pub old_path: Option<String>,
    pub is_dir: bool,
    pub timestamp: f64,
}

impl FileEvent {
    pub fn from_notify(event_type: FileEventTypeInner, path: PathBuf, is_dir: bool) -> Self {
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

// ============================================================================
// EXTENSION 1: PERSISTENT INDEX
// ============================================================================

#[napi(object)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct PersistedIndex {
    pub entries: Vec<FileEntry>,
    pub built_at: f64,
    pub root_path: String,
    pub version: u32,
}

#[napi]
pub fn save_index(path: String, index: PersistedIndex) -> Result<()> {
    let mut file = File::create(&path)
        .map_err(|e| Error::from_reason(format!("Failed to create file: {}", e)))?;
    let encoded = bincode::serialize(&index)
        .map_err(|e| Error::from_reason(format!("Failed to serialize: {}", e)))?;
    file.write_all(b"FDIX")
        .map_err(|e| Error::from_reason(e.to_string()))?;
    file.write_all(&(index.version as u64).to_le_bytes())
        .map_err(|e| Error::from_reason(e.to_string()))?;
    file.write_all(&encoded)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(())
}

#[napi]
pub fn load_index(path: String) -> Result<PersistedIndex> {
    let mut file = File::open(&path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
    let mut magic = [0u8; 4];
    file.read_exact(&mut magic)
        .map_err(|e| Error::from_reason(format!("Failed to read header: {}", e)))?;
    if &magic != b"FDIX" {
        return Err(Error::from_reason("Invalid index file format".to_string()));
    }
    let mut version_bytes = [0u8; 8];
    file.read_exact(&mut version_bytes)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    let index: PersistedIndex = bincode::deserialize(&buffer)
        .map_err(|e| Error::from_reason(format!("Failed to deserialize: {}", e)))?;
    Ok(index)
}

#[napi]
pub fn create_persisted_index(root_path: String, entries: Vec<FileEntry>) -> PersistedIndex {
    let built_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0);
    PersistedIndex { entries, built_at, root_path, version: 1 }
}

#[napi]
pub fn is_index_stale(index: PersistedIndex) -> Result<bool> {
    let root = Path::new(&index.root_path);
    if !root.exists() { return Ok(true); }
    let metadata = root.metadata().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified = metadata.modified().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified_ms = modified.duration_since(UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0);
    Ok(modified_ms > index.built_at)
}

// ============================================================================
// EXTENSION 2: CONTENT INDEXING
// ============================================================================

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ContentIndex {
    pub path: String,
    pub hash: String,
    pub line_count: u32,
    pub language: Option<String>,
    pub symbols: Vec<String>,
    pub imports: Vec<String>,
    pub encoding: String,
    pub is_binary: bool,
}

#[napi(object)]
#[derive(Default, Clone)]
pub struct ContentIndexOptions {
    pub extract_symbols: Option<bool>,
    pub parse_imports: Option<bool>,
    pub max_file_size: Option<f64>,
    pub skip_binary: Option<bool>,
}

#[napi]
pub fn index_file_content(path: String, options: Option<ContentIndexOptions>) -> Result<ContentIndex> {
    let opts = options.unwrap_or_default();
    let file_path = Path::new(&path);
    let metadata = std::fs::metadata(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to get metadata: {}", e)))?;
    let max_size = opts.max_file_size.unwrap_or(10_000_000.0) as u64;
    if metadata.len() > max_size {
        return Err(Error::from_reason(format!("File too large: {} bytes", metadata.len())));
    }
    let mut file = File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
    let mut content = Vec::new();
    file.read_to_end(&mut content)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;

    let is_binary = content_inspector::inspect(&content).is_binary();
    if is_binary && opts.skip_binary.unwrap_or(true) {
        return Ok(ContentIndex {
            path: path.clone(), hash: compute_hash(&content), line_count: 0,
            language: None, symbols: vec![], imports: vec![], encoding: "binary".to_string(), is_binary: true,
        });
    }

    let text = String::from_utf8_lossy(&content);
    let encoding = detect_encoding(&content);
    let hash = compute_hash(&content);
    let line_count = text.lines().count() as u32;
    let language = detect_language(file_path, &text);
    let symbols = if opts.extract_symbols.unwrap_or(true) {
        extract_symbols(&text, language.as_deref()).unwrap_or_default()
    } else { vec![] };
    let imports = if opts.parse_imports.unwrap_or(true) {
        parse_imports(&text, language.as_deref())
    } else { vec![] };

    Ok(ContentIndex { path, hash, line_count, language, symbols, imports, encoding, is_binary: false })
}

#[napi]
pub fn index_files_batch(paths: Vec<String>, options: Option<ContentIndexOptions>) -> Result<Vec<ContentIndex>> {
    use rayon::prelude::*;
    let opts = options.unwrap_or_default();
    let results: Vec<_> = paths.par_iter()
        .filter_map(|path| index_file_content(path.clone(), Some(opts.clone())).ok())
        .collect();
    Ok(results)
}

fn compute_hash(content: &[u8]) -> String {
    use xxhash_rust::xxh3::Xxh3;
    use std::hash::Hasher;
    let mut hasher = Xxh3::new();
    hasher.write(content);
    format!("{:016x}", hasher.finish())
}

fn detect_encoding(content: &[u8]) -> String {
    use content_inspector::ContentType;
    let inspection = content_inspector::inspect(content);
    match inspection {
        ContentType::UTF_8 | ContentType::UTF_8_BOM => "utf-8".to_string(),
        ContentType::UTF_16BE | ContentType::UTF_16LE => "utf-16".to_string(),
        ContentType::UTF_32BE | ContentType::UTF_32LE => "utf-32".to_string(),
        _ => if inspection.is_text() { "text".to_string() } else { "unknown".to_string() },
    }
}

fn detect_language(path: &Path, content: &str) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    let lang_by_ext = match ext.as_str() {
        "ts" | "tsx" => Some("typescript"), "js" | "jsx" => Some("javascript"),
        "py" => Some("python"), "rs" => Some("rust"), "go" => Some("go"),
        "c" => Some("c"), "cpp" | "cc" | "cxx" => Some("cpp"),
        "h" => Some("c"), "hpp" => Some("cpp"), "java" => Some("java"),
        "rb" => Some("ruby"), "php" => Some("php"), "swift" => Some("swift"),
        "kt" => Some("kotlin"), "scala" => Some("scala"),
        "sh" | "bash" | "zsh" => Some("bash"), "json" => Some("json"),
        "yaml" | "yml" => Some("yaml"), "toml" => Some("toml"),
        "md" => Some("markdown"), "html" => Some("html"),
        "css" => Some("css"), "scss" => Some("scss"), "sql" => Some("sql"),
        _ => None,
    };
    if lang_by_ext.is_some() { return lang_by_ext.map(|s| s.to_string()); }
    let first_line = content.lines().next()?;
    if first_line.starts_with("#!") {
        if first_line.contains("python") { return Some("python".to_string()); }
        if first_line.contains("node") || first_line.contains("deno") || first_line.contains("bun") { return Some("javascript".to_string()); }
        if first_line.contains("bash") || first_line.contains("sh") { return Some("bash".to_string()); }
        if first_line.contains("ruby") { return Some("ruby".to_string()); }
    }
    None
}

fn extract_symbols(content: &str, language: Option<&str>) -> Result<Vec<String>> {
    let mut symbols = Vec::new();
    match language {
        Some("typescript" | "javascript") => {
            let func_re = regex::Regex::new(r"(?:function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)")
                .map_err(|e| Error::from_reason(e.to_string()))?;
            let class_re = regex::Regex::new(r"(?:class|interface|type|enum)\s+([a-zA-Z_][a-zA-Z0-9_]*)")
                .map_err(|e| Error::from_reason(e.to_string()))?;
            for cap in func_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
            for cap in class_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
        }
        Some("python") => {
            let func_re = regex::Regex::new(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            let class_re = regex::Regex::new(r"class\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            for cap in func_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
            for cap in class_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
        }
        Some("rust") => {
            let func_re = regex::Regex::new(r"fn\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            let struct_re = regex::Regex::new(r"struct\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            let enum_re = regex::Regex::new(r"enum\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            for cap in func_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
            for cap in struct_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
            for cap in enum_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
        }
        Some("go") => {
            let func_re = regex::Regex::new(r"func\s+(?:\([^)]+\)\s*)?([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            let type_re = regex::Regex::new(r"type\s+([a-zA-Z_][a-zA-Z0-9_]*)").map_err(|e| Error::from_reason(e.to_string()))?;
            for cap in func_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
            for cap in type_re.captures_iter(content) { symbols.push(cap[1].to_string()); }
        }
        _ => {}
    }
    Ok(symbols)
}

fn parse_imports(content: &str, language: Option<&str>) -> Vec<String> {
    let mut imports = Vec::new();
    match language {
        Some("typescript" | "javascript") => {
            let import_re = regex::Regex::new(r#"import\s+.*?from\s+['"]([^'"]+)['"]"#).unwrap();
            let require_re = regex::Regex::new(r#"require\s*\(\s*['"]([^'"]+)['"]\s*\)"#).unwrap();
            for cap in import_re.captures_iter(content) { imports.push(cap[1].to_string()); }
            for cap in require_re.captures_iter(content) { imports.push(cap[1].to_string()); }
        }
        Some("python") => {
            let import_re = regex::Regex::new(r#"^(?:import|from)\s+(\S+)"#).unwrap();
            for cap in import_re.captures_iter(content) { imports.push(cap[1].to_string()); }
        }
        Some("rust") => {
            let use_re = regex::Regex::new(r"use\s+([^;]+)").unwrap();
            for cap in use_re.captures_iter(content) { imports.push(cap[1].trim().to_string()); }
        }
        _ => {}
    }
    imports
}

// ============================================================================
// EXTENSION 3: DUPLICATE DETECTION
// ============================================================================

#[napi(object)]
#[derive(Debug)]
pub struct DuplicateGroup {
    pub hash: String,
    pub size: f64,
    pub paths: Vec<String>,
    pub wasted_space: f64,
}

#[napi(object)]
#[derive(Default)]
pub struct DuplicateOptions {
    pub min_size: Option<f64>,
    pub max_size: Option<f64>,
    pub extensions: Option<Vec<String>>,
    pub skip_hidden: Option<bool>,
}

#[napi]
pub fn find_duplicates(path: String, options: Option<DuplicateOptions>) -> Result<Vec<DuplicateGroup>> {
    let opts = options.unwrap_or_default();
    let root = Path::new(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let min_size = opts.min_size.unwrap_or(0.0) as u64;
    let max_size = opts.max_size.unwrap_or(u64::MAX as f64) as u64;
    let skip_hidden = opts.skip_hidden.unwrap_or(true);

    // First pass: group by size
    let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    for entry_result in WalkDir::new(root).into_iter() {
        let entry = match entry_result { Ok(e) => e, Err(_) => continue };
        let file_name = entry.file_name().to_string_lossy();
        if skip_hidden && file_name.starts_with('.') { continue; }
        let metadata = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        if !metadata.is_file() { continue; }
        let size = metadata.len();
        if size < min_size || size > max_size { continue; }
        if let Some(ref exts) = opts.extensions {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if !exts.contains(&ext.to_string()) { continue; }
            } else { continue; }
        }
        by_size.entry(size).or_default().push(entry.path().to_path_buf());
    }

    // Second pass: hash files with same size
    let mut by_hash: HashMap<String, Vec<PathBuf>> = HashMap::new();
    for (_size, paths) in by_size.iter() {
        if paths.len() > 1 {
            for path in paths {
                if let Ok(hash) = get_file_hash_internal(path) {
                    by_hash.entry(hash).or_default().push(path.clone());
                }
            }
        }
    }

    let mut duplicates = Vec::new();
    for (hash, paths) in by_hash.into_iter() {
        if paths.len() > 1 {
            let size = std::fs::metadata(&paths[0]).map(|m| m.len() as f64).unwrap_or(0.0);
            let wasted = size * (paths.len() - 1) as f64;
            duplicates.push(DuplicateGroup {
                hash, size,
                paths: paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect(),
                wasted_space: wasted,
            });
        }
    }
    duplicates.sort_by(|a, b| b.wasted_space.partial_cmp(&a.wasted_space).unwrap_or(std::cmp::Ordering::Equal));
    Ok(duplicates)
}

fn get_file_hash_internal(path: &Path) -> Result<String> {
    use std::io::Read;
    use xxhash_rust::xxh3::Xxh3;
    use std::hash::Hasher;
    let mut file = File::open(path).map_err(|e| Error::from_reason(format!("Failed to open: {}", e)))?;
    let mut hasher = Xxh3::new();
    let mut buffer = [0u8; 8192];
    loop {
        let bytes_read = file.read(&mut buffer).map_err(|e| Error::from_reason(e.to_string()))?;
        if bytes_read == 0 { break; }
        hasher.write(&buffer[..bytes_read]);
    }
    Ok(format!("{:016x}", hasher.finish()))
}

// ============================================================================
// EXTENSION 4: DEBOUNCED WATCHING
// ============================================================================

#[napi(object)]
#[derive(Clone)]
pub struct WatchOptions {
    pub debounce_ms: Option<u32>,
    pub ignore_patterns: Option<Vec<String>>,
    pub ignore_temp_files: Option<bool>,
    pub ignore_hidden: Option<bool>,
    pub extensions: Option<Vec<String>>,
}

impl Default for WatchOptions {
    fn default() -> Self {
        WatchOptions { debounce_ms: Some(100), ignore_patterns: None, ignore_temp_files: Some(true), ignore_hidden: Some(true), extensions: None }
    }
}

#[napi]
pub struct FileWatcher {
    watcher: Option<Arc<Mutex<notify::RecommendedWatcher>>>,
    path: PathBuf,
    event_rx: Option<Arc<Mutex<crossbeam_channel::Receiver<FileEvent>>>>,
}

#[napi]
impl FileWatcher {
    #[napi]
    pub fn stop(&mut self) -> Result<()> {
        if let Some(watcher) = self.watcher.take() {
            let mut w = watcher.lock().map_err(|e| Error::from_reason(e.to_string()))?;
            let _ = w.unwatch(&self.path);
        }
        Ok(())
    }

    #[napi]
    pub fn get_path(&self) -> String { self.path.to_string_lossy().to_string() }

    #[napi]
    pub fn poll_events(&self, env: Env) -> Result<Vec<FileEvent>> {
        let _ = env;
        let rx = self.event_rx.as_ref().ok_or_else(|| Error::from_reason("Watcher not active".to_string()))?;
        let rx = rx.lock().map_err(|e| Error::from_reason(e.to_string()))?;
        let mut events = Vec::new();
        while let Ok(event) = rx.try_recv() { events.push(event); }
        Ok(events)
    }
}

#[napi]
pub fn watch_directory_debounced(path: String, options: Option<WatchOptions>) -> Result<FileWatcher> {
    let opts = options.unwrap_or_default();
    let root = PathBuf::from(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let debounce_ms = opts.debounce_ms.unwrap_or(100);
    let ignore_temp = opts.ignore_temp_files.unwrap_or(true);
    let ignore_hidden = opts.ignore_hidden.unwrap_or(true);

    let ignore_patterns: Vec<glob::Pattern> = opts.ignore_patterns.unwrap_or_default().iter()
        .filter_map(|p| glob::Pattern::new(p).ok()).collect();

    let (tx, rx) = crossbeam_channel::unbounded();

    let watcher = notify::RecommendedWatcher::new(
        move |res: std::result::Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    notify::EventKind::Create(_) => FileEventTypeInner::Add,
                    notify::EventKind::Modify(_) => FileEventTypeInner::Modify,
                    notify::EventKind::Remove(_) => FileEventTypeInner::Remove,
                    notify::EventKind::Access(_) => return,
                    _ => FileEventTypeInner::Other,
                };
                for path in event.paths {
                    let path_str = path.to_string_lossy();
                    let file_name = path.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();
                    if ignore_hidden && file_name.starts_with('.') { continue; }
                    if ignore_temp && is_temp_file(&file_name) { continue; }
                    if ignore_patterns.iter().any(|p| p.matches(&path_str)) { continue; }
                    if let Some(ref exts) = opts.extensions {
                        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                            if !exts.contains(&ext.to_string()) { continue; }
                        } else { continue; }
                    }
                    let is_dir = path.is_dir();
                    let file_event = FileEvent::from_notify(event_type, path.clone(), is_dir);
                    let _ = tx.send(file_event);
                }
            }
        },
        notify::Config::default().with_poll_interval(Duration::from_millis(debounce_ms as u64)),
    ).map_err(|e| Error::from_reason(format!("Failed to create watcher: {}", e)))?;

    let watcher = Arc::new(Mutex::new(watcher));
    { let mut w = watcher.lock().map_err(|e| Error::from_reason(e.to_string()))?;
      w.watch(&root, notify::RecursiveMode::Recursive).map_err(|e| Error::from_reason(format!("Failed to start watching: {}", e)))?; }

    Ok(FileWatcher { watcher: Some(watcher), path: root, event_rx: Some(Arc::new(Mutex::new(rx))) })
}

#[napi]
pub fn watch_with_callback(path: String, options: Option<WatchOptions>, callback: ThreadsafeFunction<FileEvent>) -> Result<FileWatcher> {
    let opts = options.unwrap_or_default();
    let root = PathBuf::from(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let ignore_temp = opts.ignore_temp_files.unwrap_or(true);
    let ignore_hidden = opts.ignore_hidden.unwrap_or(true);
    let ignore_patterns: Vec<glob::Pattern> = opts.ignore_patterns.unwrap_or_default().iter()
        .filter_map(|p| glob::Pattern::new(p).ok()).collect();

    let watcher = notify::RecommendedWatcher::new(
        move |res: std::result::Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    notify::EventKind::Create(_) => FileEventTypeInner::Add,
                    notify::EventKind::Modify(_) => FileEventTypeInner::Modify,
                    notify::EventKind::Remove(_) => FileEventTypeInner::Remove,
                    _ => return,
                };
                for path in event.paths {
                    let path_str = path.to_string_lossy();
                    let file_name = path.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();
                    if ignore_hidden && file_name.starts_with('.') { continue; }
                    if ignore_temp && is_temp_file(&file_name) { continue; }
                    if ignore_patterns.iter().any(|p| p.matches(&path_str)) { continue; }
                    let file_event = FileEvent::from_notify(event_type, path, false);
                    callback.call(Ok(file_event), ThreadsafeFunctionCallMode::NonBlocking);
                }
            }
        },
        notify::Config::default(),
    ).map_err(|e| Error::from_reason(format!("Failed to create watcher: {}", e)))?;

    let watcher = Arc::new(Mutex::new(watcher));
    { let mut w = watcher.lock().map_err(|e| Error::from_reason(e.to_string()))?;
      w.watch(&root, notify::RecursiveMode::Recursive).map_err(|e| Error::from_reason(format!("Failed to start watching: {}", e)))?; }

    Ok(FileWatcher { watcher: Some(watcher), path: root, event_rx: None })
}

fn is_temp_file(name: &str) -> bool {
    let temp_patterns = [".tmp", ".temp", ".swp", ".swo", "~", ".DS_Store", "Thumbs.db", ".git", ".idea", ".vscode"];
    temp_patterns.iter().any(|p| name.ends_with(p) || name == *p)
}

// ============================================================================
// EXTENSION 5: GIT-AWARE SCANNING
// ============================================================================

#[napi(object)]
#[derive(Default, Clone)]
pub struct GitAwareOptions {
    pub respect_gitignore: Option<bool>,
    pub include_untracked: Option<bool>,
    pub include_ignored: Option<bool>,
    pub include_git_dir: Option<bool>,
}

#[napi]
pub fn scan_git_aware(path: String, options: Option<GitAwareOptions>) -> Result<ScanResult> {
    use ignore::WalkBuilder;
    let start = Instant::now();
    let opts = options.unwrap_or_default();
    let root = Path::new(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let respect_gitignore = opts.respect_gitignore.unwrap_or(true);
    let include_ignored = opts.include_ignored.unwrap_or(false);
    let include_git_dir = opts.include_git_dir.unwrap_or(false);

    let mut entries = Vec::new();
    let mut total_files = 0u32;
    let mut total_dirs = 0u32;
    let mut total_size = 0u64;
    let mut skipped = 0u32;

    let mut builder = WalkBuilder::new(root);
    builder.git_ignore(respect_gitignore).git_global(respect_gitignore).git_exclude(respect_gitignore)
        .hidden(!include_git_dir).ignore(!include_ignored);

    for entry_result in builder.build() {
        let entry = match entry_result { Ok(e) => e, Err(_) => { skipped += 1; continue } };
        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();
        if !include_git_dir && path_str.contains("/.git/") { continue; }

        let metadata = match entry.metadata() { Ok(m) => m, Err(_) => { skipped += 1; continue } };
        let is_dir = metadata.is_dir();
        let modified = metadata.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64).unwrap_or(0.0);
        let size = metadata.len();
        let extension = path.extension().map(|e| e.to_string_lossy().to_string());
        let name = entry.file_name().to_string_lossy().to_string();

        if is_dir { total_dirs += 1; } else { total_files += 1; total_size += size; }
        entries.push(FileEntry { path: path_str, size: size as f64, modified, is_dir, extension, name, hash: None });
    }

    Ok(ScanResult { entries, total_files, total_dirs, total_size: total_size as f64,
        duration_ms: start.elapsed().as_millis() as u32, skipped })
}

// ============================================================================
// EXTENSION 6: PARALLEL HASHING
// ============================================================================

#[napi]
pub fn hash_batch(paths: Vec<String>) -> Result<HashMap<String, String>> {
    use rayon::prelude::*;
    let results: Vec<_> = paths.par_iter()
        .filter_map(|path| {
            let p = Path::new(path);
            if p.exists() && p.is_file() { get_file_hash_internal(p).ok().map(|h| (path.clone(), h)) }
            else { None }
        }).collect();
    Ok(results.into_iter().collect())
}

#[napi(object)]
pub struct HashProgress {
    pub current: u32,
    pub total: u32,
    pub path: String,
    pub hash: String,
}

#[napi]
pub fn hash_batch_with_progress(paths: Vec<String>, callback: ThreadsafeFunction<HashProgress>) -> Result<HashMap<String, String>> {
    use rayon::prelude::*;
    let total = paths.len();
    let processed = Arc::new(Mutex::new(0usize));

    let results: Vec<_> = paths.par_iter()
        .filter_map(|path| {
            let p = Path::new(path);
            if p.exists() && p.is_file() {
                let hash = get_file_hash_internal(p).ok()?;
                if let Ok(mut count) = processed.lock() {
                    *count += 1;
                    let progress = HashProgress { current: *count as u32, total: total as u32, path: path.clone(), hash: hash.clone() };
                    callback.call(Ok(progress), ThreadsafeFunctionCallMode::NonBlocking);
                }
                Some((path.clone(), hash))
            } else { None }
        }).collect();
    Ok(results.into_iter().collect())
}

// ============================================================================
// EXTENSION 7: FILE CHANGE DIFF
// ============================================================================

#[napi(object)]
#[derive(Debug)]
pub struct RenameEntry {
    pub old_path: String,
    pub new_path: String,
    pub entry: FileEntry,
}

#[napi(object)]
#[derive(Debug)]
pub struct IndexDiff {
    pub added: Vec<FileEntry>,
    pub removed: Vec<String>,
    pub modified: Vec<FileEntry>,
    pub renamed: Vec<RenameEntry>,
}

#[napi]
pub fn diff_indexes(old: Vec<FileEntry>, new: Vec<FileEntry>) -> IndexDiff {
    let old_map: HashMap<String, &FileEntry> = old.iter().map(|e| (e.path.clone(), e)).collect();
    let new_map: HashMap<String, &FileEntry> = new.iter().map(|e| (e.path.clone(), e)).collect();

    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut modified = Vec::new();
    let mut renamed = Vec::new();

    for entry in &new {
        if !old_map.contains_key(&entry.path) {
            let mut found_rename = false;
            if let Some(hash) = &entry.hash {
                for (old_path, old_entry) in &old_map {
                    if !new_map.contains_key(old_path) {
                        if let Some(old_hash) = &old_entry.hash {
                            if hash == old_hash && entry.size == old_entry.size {
                                renamed.push(RenameEntry { old_path: old_path.clone(), new_path: entry.path.clone(), entry: entry.clone() });
                                found_rename = true;
                                break;
                            }
                        }
                    }
                }
            }
            if !found_rename { added.push(entry.clone()); }
        } else if let Some(old_entry) = old_map.get(&entry.path) {
            if entry.size != old_entry.size || entry.modified != old_entry.modified {
                modified.push(entry.clone());
            }
        }
    }

    let renamed_old_paths: Vec<_> = renamed.iter().map(|r| &r.old_path).collect();
    for entry in &old {
        if !new_map.contains_key(&entry.path) && !renamed_old_paths.contains(&&entry.path) {
            removed.push(entry.path.clone());
        }
    }

    IndexDiff { added, removed, modified, renamed }
}

// ============================================================================
// EXTENSION 8: MAGIC BYTE DETECTION
// ============================================================================

#[napi(object)]
#[derive(Debug)]
pub struct DetectedFileType {
    pub mime_type: String,
    pub description: String,
    pub is_text: bool,
    pub is_binary: bool,
    pub encoding: Option<String>,
}

#[napi]
pub fn detect_file_type(path: String) -> Result<DetectedFileType> {
    let file_path = Path::new(&path);
    let mut file = File::open(file_path).map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
    let mut buffer = [0u8; 512];
    let bytes_read = file.read(&mut buffer).map_err(|e| Error::from_reason(e.to_string()))?;
    let header = &buffer[..bytes_read];
    let detected = detect_magic_bytes(header);
    if detected.mime_type == "application/octet-stream" {
        if let Some(ext) = file_path.extension().and_then(|e| e.to_str()) {
            return Ok(detect_by_extension(ext));
        }
    }
    Ok(detected)
}

fn detect_magic_bytes(header: &[u8]) -> DetectedFileType {
    let inspection = content_inspector::inspect(header);
    if inspection.is_binary() {
        if header.starts_with(b"\x89PNG\r\n\x1a\n") { return DetectedFileType { mime_type: "image/png".into(), description: "PNG Image".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(&[0xFF, 0xD8, 0xFF]) { return DetectedFileType { mime_type: "image/jpeg".into(), description: "JPEG Image".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"GIF87a") || header.starts_with(b"GIF89a") { return DetectedFileType { mime_type: "image/gif".into(), description: "GIF Image".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"PK\x03\x04") { return DetectedFileType { mime_type: "application/zip".into(), description: "ZIP Archive".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"\x1f\x8b") { return DetectedFileType { mime_type: "application/gzip".into(), description: "GZIP Archive".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"BM") { return DetectedFileType { mime_type: "image/bmp".into(), description: "BMP Image".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(&[0x00, 0x00, 0x01, 0x00]) { return DetectedFileType { mime_type: "image/x-icon".into(), description: "ICO Icon".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"%PDF") { return DetectedFileType { mime_type: "application/pdf".into(), description: "PDF Document".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(&[0x4D, 0x5A]) { return DetectedFileType { mime_type: "application/x-dosexec".into(), description: "Windows Executable".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(&[0x7F, 0x45, 0x4C, 0x46]) { return DetectedFileType { mime_type: "application/x-elf".into(), description: "ELF Executable".into(), is_text: false, is_binary: true, encoding: None }; }
        if header.starts_with(b"SQLite format 3") { return DetectedFileType { mime_type: "application/x-sqlite3".into(), description: "SQLite Database".into(), is_text: false, is_binary: true, encoding: None }; }
        return DetectedFileType { mime_type: "application/octet-stream".into(), description: "Binary File".into(), is_text: false, is_binary: true, encoding: None };
    }
    let encoding = detect_encoding(header);
    let text = String::from_utf8_lossy(header);
    if text.starts_with("<?xml") || text.starts_with("<!DOCTYPE") || text.starts_with("<html") {
        return DetectedFileType { mime_type: "text/html".into(), description: "HTML/XML Document".into(), is_text: true, is_binary: false, encoding: Some(encoding) };
    }
    if text.trim_start().starts_with('{') || text.trim_start().starts_with('[') {
        return DetectedFileType { mime_type: "application/json".into(), description: "JSON Data".into(), is_text: true, is_binary: false, encoding: Some(encoding) };
    }
    DetectedFileType { mime_type: "text/plain".into(), description: "Plain Text".into(), is_text: true, is_binary: false, encoding: Some(encoding) }
}

fn detect_by_extension(ext: &str) -> DetectedFileType {
    match ext.to_lowercase().as_str() {
        "ts" | "tsx" => DetectedFileType { mime_type: "text/typescript".into(), description: "TypeScript Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "js" | "jsx" | "mjs" | "cjs" => DetectedFileType { mime_type: "text/javascript".into(), description: "JavaScript Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "py" => DetectedFileType { mime_type: "text/x-python".into(), description: "Python Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "rs" => DetectedFileType { mime_type: "text/x-rust".into(), description: "Rust Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "go" => DetectedFileType { mime_type: "text/x-go".into(), description: "Go Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "java" => DetectedFileType { mime_type: "text/x-java".into(), description: "Java Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "c" | "h" => DetectedFileType { mime_type: "text/x-c".into(), description: "C Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "cpp" | "cc" | "cxx" | "hpp" => DetectedFileType { mime_type: "text/x-c++".into(), description: "C++ Source".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "md" => DetectedFileType { mime_type: "text/markdown".into(), description: "Markdown Document".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "json" => DetectedFileType { mime_type: "application/json".into(), description: "JSON Data".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "yaml" | "yml" => DetectedFileType { mime_type: "text/yaml".into(), description: "YAML Data".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "toml" => DetectedFileType { mime_type: "text/x-toml".into(), description: "TOML Data".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "css" | "scss" | "sass" => DetectedFileType { mime_type: "text/css".into(), description: "CSS Stylesheet".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "html" | "htm" => DetectedFileType { mime_type: "text/html".into(), description: "HTML Document".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "sh" | "bash" | "zsh" => DetectedFileType { mime_type: "text/x-shellscript".into(), description: "Shell Script".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        "sql" => DetectedFileType { mime_type: "text/x-sql".into(), description: "SQL Script".into(), is_text: true, is_binary: false, encoding: Some("utf-8".into()) },
        _ => DetectedFileType { mime_type: "application/octet-stream".into(), description: "Unknown File Type".into(), is_text: false, is_binary: false, encoding: None },
    }
}

// ============================================================================
// EXTENSION 9: DISK USAGE TREEMAP
// ============================================================================

#[napi(object)]
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TreemapNode {
    pub name: String,
    pub path: String,
    pub size: f64,
    pub file_count: u32,
    pub dir_count: u32,
    pub children: Vec<TreemapNode>,
    pub is_dir: bool,
    pub percentage: f64,
}

#[napi]
pub fn build_treemap(path: String, max_depth: Option<u32>) -> Result<TreemapNode> {
    let root = Path::new(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }
    let depth = max_depth.map(|d| d as usize).unwrap_or(3);
    let name = root.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| path.clone());
    build_treemap_node(root, &name, depth)
}

fn build_treemap_node(path: &Path, name: &str, remaining_depth: usize) -> Result<TreemapNode> {
    let metadata = path.metadata().map_err(|e| Error::from_reason(e.to_string()))?;
    if !path.is_dir() {
        return Ok(TreemapNode { name: name.to_string(), path: path.to_string_lossy().to_string(),
            size: metadata.len() as f64, file_count: 1, dir_count: 0, children: vec![], is_dir: false, percentage: 100.0 });
    }

    let mut children = Vec::new();
    let mut total_size = 0u64;
    let mut file_count = 0u32;
    let mut dir_count = 0u32;

    if remaining_depth > 0 {
        let entries: Vec<_> = std::fs::read_dir(path).map_err(|e| Error::from_reason(e.to_string()))?
            .filter_map(|e| e.ok()).collect();
        for entry in entries {
            let child_path = entry.path();
            let child_name = entry.file_name().to_string_lossy().to_string();
            if let Ok(child_node) = build_treemap_node(&child_path, &child_name, remaining_depth - 1) {
                total_size += child_node.size as u64;
                file_count += child_node.file_count;
                dir_count += child_node.dir_count + if child_node.is_dir { 1 } else { 0 };
                children.push(child_node);
            }
        }
        for child in &mut children {
            child.percentage = if total_size > 0 { (child.size / total_size as f64) * 100.0 } else { 0.0 };
        }
        children.sort_by(|a, b| b.size.partial_cmp(&a.size).unwrap_or(std::cmp::Ordering::Equal));
    }

    Ok(TreemapNode { name: name.to_string(), path: path.to_string_lossy().to_string(), size: total_size as f64,
        file_count, dir_count, children, is_dir: true, percentage: 100.0 })
}

#[napi]
pub fn find_largest_files(path: String, limit: Option<u32>) -> Result<Vec<FileEntry>> {
    let root = Path::new(&path);
    let limit = limit.unwrap_or(100) as usize;
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let mut files = Vec::new();
    for entry_result in WalkDir::new(root).into_iter() {
        let entry = match entry_result { Ok(e) => e, Err(_) => continue };
        let metadata = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        if metadata.is_file() {
            let path = entry.path();
            let modified = metadata.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as f64).unwrap_or(0.0);
            files.push(FileEntry {
                path: path.to_string_lossy().to_string(), size: metadata.len() as f64, modified,
                is_dir: false, extension: path.extension().map(|e| e.to_string_lossy().to_string()),
                name: entry.file_name().to_string_lossy().to_string(), hash: None,
            });
        }
    }
    files.sort_by(|a, b| b.size.partial_cmp(&a.size).unwrap_or(std::cmp::Ordering::Equal));
    files.truncate(limit);
    Ok(files)
}

// ============================================================================
// ORIGINAL FUNCTIONS (kept for compatibility)
// ============================================================================

#[napi]
pub fn scan_directory(path: String, options: Option<ScanOptions>) -> Result<ScanResult> {
    let start = Instant::now();
    let opts = options.unwrap_or_default();
    let root = Path::new(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let max_depth = opts.max_depth.map(|d| d as usize).unwrap_or(usize::MAX);
    let follow_links = opts.follow_symlinks.unwrap_or(false);
    let skip_hidden = opts.skip_hidden.unwrap_or(true);
    let include_dirs = opts.include_dirs.unwrap_or(false);
    let limit = opts.limit.unwrap_or(u32::MAX) as usize;
    let compute_hashes = opts.compute_hashes.unwrap_or(false);

    let exclude_patterns: Vec<glob::Pattern> = opts.exclude_patterns.unwrap_or_default().iter()
        .filter_map(|p| glob::Pattern::new(p).ok()).collect();
    let include_patterns: Vec<glob::Pattern> = opts.include_patterns.unwrap_or_default().iter()
        .filter_map(|p| glob::Pattern::new(p).ok()).collect();

    let mut entries = Vec::new();
    let mut total_files = 0u32;
    let mut total_dirs = 0u32;
    let mut total_size = 0u64;
    let mut skipped = 0u32;

    for entry_result in WalkDir::new(root).max_depth(max_depth).follow_links(follow_links).into_iter() {
        if entries.len() >= limit { skipped += 1; continue; }
        let entry = match entry_result { Ok(e) => e, Err(_) => { skipped += 1; continue } };
        let path = entry.path();
        let path_str = path.to_string_lossy();
        let file_name = entry.file_name().to_string_lossy();
        if skip_hidden && file_name.starts_with('.') { continue; }
        let path_string = path_str.to_string();
        if exclude_patterns.iter().any(|p| p.matches(&path_string)) { continue; }
        let metadata = match entry.metadata() { Ok(m) => m, Err(_) => { skipped += 1; continue } };
        let is_dir = metadata.is_dir();
        if is_dir && !include_dirs { continue; }
        if !is_dir && !include_patterns.is_empty() && !include_patterns.iter().any(|p| p.matches(&path_string)) { continue; }

        let modified = metadata.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64).unwrap_or(0.0);
        let size = metadata.len();
        let extension = path.extension().map(|e| e.to_string_lossy().to_string());
        let hash = if compute_hashes && !is_dir { get_file_hash_internal(path).ok() } else { None };

        if is_dir { total_dirs += 1; } else { total_files += 1; total_size += size; }
        entries.push(FileEntry { path: path_string, size: size as f64, modified, is_dir, extension, name: file_name.to_string(), hash });
    }

    Ok(ScanResult { entries, total_files, total_dirs, total_size: total_size as f64, duration_ms: start.elapsed().as_millis() as u32, skipped })
}

#[napi]
pub fn get_directory_stats(path: String, max_depth: Option<u32>) -> Result<DirectoryStats> {
    let root = Path::new(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }

    let mut file_count = 0u32;
    let mut dir_count = 0u32;
    let mut total_size = 0u64;
    let mut by_extension: HashMap<String, u32> = HashMap::new();
    let mut all_files: Vec<FileEntry> = Vec::new();
    let depth = max_depth.map(|d| d as usize).unwrap_or(usize::MAX);

    for entry_result in WalkDir::new(root).max_depth(depth).into_iter() {
        let entry = match entry_result { Ok(e) => e, Err(_) => continue };
        let metadata = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        if metadata.is_dir() { dir_count += 1; continue; }
        file_count += 1;
        let size = metadata.len();
        total_size += size;
        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            *by_extension.entry(ext.to_string()).or_insert(0) += 1;
        }
        let modified = metadata.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64).unwrap_or(0.0);
        all_files.push(FileEntry {
            path: path.to_string_lossy().to_string(), size: size as f64, modified, is_dir: false,
            extension: path.extension().map(|e| e.to_string_lossy().to_string()),
            name: entry.file_name().to_string_lossy().to_string(), hash: None,
        });
    }
    all_files.sort_by(|a, b| b.size.partial_cmp(&a.size).unwrap_or(std::cmp::Ordering::Equal));
    let largest_files: Vec<FileEntry> = all_files.into_iter().take(10).collect();

    Ok(DirectoryStats { file_count, dir_count, total_size: total_size as f64, by_extension, largest_files })
}

#[napi]
pub fn has_changed(path: String, since_ms: f64) -> Result<bool> {
    let p = Path::new(&path);
    if !p.exists() { return Ok(true); }
    let metadata = p.metadata().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified = metadata.modified().map_err(|e| Error::from_reason(e.to_string()))?;
    let modified_ms = modified.duration_since(UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0);
    Ok(modified_ms > since_ms)
}

#[napi]
pub fn get_file_hash(path: String) -> Result<String> { get_file_hash_internal(Path::new(&path)) }

#[napi]
pub fn file_exists(path: String) -> bool { Path::new(&path).exists() }

#[napi]
pub fn is_directory(path: String) -> bool { Path::new(&path).is_dir() }

#[napi]
pub fn get_file_size(path: String) -> Result<f64> {
    let metadata = std::fs::metadata(&path).map_err(|e| Error::from_reason(format!("Failed to get metadata: {}", e)))?;
    Ok(metadata.len() as f64)
}

#[napi]
pub fn get_modified_time(path: String) -> Result<f64> {
    let metadata = std::fs::metadata(&path).map_err(|e| Error::from_reason(format!("Failed to get metadata: {}", e)))?;
    let modified = metadata.modified().map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(modified.duration_since(UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0))
}

#[napi]
pub fn find_files(pattern: String, base_path: Option<String>) -> Result<Vec<String>> {
    let base = base_path.unwrap_or_else(|| ".".to_string());
    let full_pattern = if pattern.starts_with('/') { pattern } else { format!("{}/{}", base, pattern) };
    let paths: Vec<String> = glob::glob(&full_pattern)
        .map_err(|e| Error::from_reason(format!("Invalid pattern: {}", e)))?
        .filter_map(|r| r.ok()).map(|p| p.to_string_lossy().to_string()).collect();
    Ok(paths)
}

#[napi]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>> {
    let dir = Path::new(&path);
    if !dir.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }
    if !dir.is_dir() { return Err(Error::from_reason(format!("Not a directory: {}", path))); }

    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(dir).map_err(|e| Error::from_reason(format!("Failed to read directory: {}", e)))?;
    for entry_result in read_dir {
        let entry = entry_result.map_err(|e| Error::from_reason(e.to_string()))?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| Error::from_reason(e.to_string()))?;
        let modified = metadata.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64).unwrap_or(0.0);
        entries.push(FileEntry {
            path: path.to_string_lossy().to_string(), size: metadata.len() as f64, modified,
            is_dir: metadata.is_dir(), extension: path.extension().map(|e| e.to_string_lossy().to_string()),
            name: entry.file_name().to_string_lossy().to_string(), hash: None,
        });
    }
    Ok(entries)
}

#[napi]
pub fn watch_directory(path: String) -> Result<FileWatcher> {
    let root = PathBuf::from(&path);
    if !root.exists() { return Err(Error::from_reason(format!("Path does not exist: {}", path))); }
    let (tx, rx) = crossbeam_channel::unbounded();

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
        },
        notify::Config::default(),
    ).map_err(|e| Error::from_reason(format!("Failed to create watcher: {}", e)))?;

    let watcher = Arc::new(Mutex::new(watcher));
    { let mut w = watcher.lock().map_err(|e| Error::from_reason(e.to_string()))?;
      w.watch(&root, notify::RecursiveMode::Recursive).map_err(|e| Error::from_reason(format!("Failed to start watching: {}", e)))?; }

    Ok(FileWatcher { watcher: Some(watcher), path: root, event_rx: Some(Arc::new(Mutex::new(rx))) })
}
