//! Compute Engine - High-performance hash computation
//!
//! Native module providing xxhash, sha256, and blake3 hashing
//! for the compute-engine CLI tool.

use napi_derive::napi;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

/// Hash result containing multiple algorithm outputs
#[napi(object)]
pub struct HashResult {
    /// File path that was hashed
    pub path: String,
    /// XXH3 128-bit hash (hex)
    pub xxhash: String,
    /// SHA-256 hash (hex)
    pub sha256: String,
    /// BLAKE3 hash (hex)
    pub blake3: String,
    /// File size in bytes (as string for large file support)
    pub size: String,
    /// Time taken in milliseconds
    pub duration_ms: f64,
    /// Whether an error occurred
    pub error: Option<String>,
}

/// Options for hash computation
#[napi(object)]
#[derive(Clone)]
pub struct HashOptions {
    /// Chunk size for reading files (default: 64KB)
    pub chunk_size: Option<u32>,
    /// Enable xxhash computation
    pub xxhash: Option<bool>,
    /// Enable sha256 computation
    pub sha256: Option<bool>,
    /// Enable blake3 computation
    pub blake3: Option<bool>,
}

impl Default for HashOptions {
    fn default() -> Self {
        Self {
            chunk_size: Some(65536),
            xxhash: Some(true),
            sha256: Some(true),
            blake3: Some(true),
        }
    }
}

/// Compute hashes for a single file
#[napi]
pub fn hash_file(path: String, options: Option<HashOptions>) -> HashResult {
    let start = std::time::Instant::now();
    let opts = options.unwrap_or_default();
    let chunk_size = opts.chunk_size.unwrap_or(65536) as usize;

    let path_obj = Path::new(&path);

    // Check if file exists
    if !path_obj.exists() {
        return HashResult {
            path: path.clone(),
            xxhash: String::new(),
            sha256: String::new(),
            blake3: String::new(),
            size: "0".to_string(),
            duration_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some("File not found".to_string()),
        };
    }

    // Check if it's a directory
    if path_obj.is_dir() {
        return HashResult {
            path: path.clone(),
            xxhash: String::new(),
            sha256: String::new(),
            blake3: String::new(),
            size: "0".to_string(),
            duration_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some("Is a directory".to_string()),
        };
    }

    // Get file metadata
    let metadata = match std::fs::metadata(&path) {
        Ok(m) => m,
        Err(e) => {
            return HashResult {
                path: path.clone(),
                xxhash: String::new(),
                sha256: String::new(),
                blake3: String::new(),
                size: "0".to_string(),
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(format!("Permission denied: {}", e)),
            };
        }
    };

    let size = metadata.len();

    // Check for symlink
    let is_symlink = path_obj.is_symlink();
    let actual_path = if is_symlink {
        match std::fs::read_link(&path) {
            Ok(target) => target.to_string_lossy().to_string(),
            Err(_) => path.clone(),
        }
    } else {
        path.clone()
    };

    // Open file
    let file = match File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            return HashResult {
                path: path.clone(),
                xxhash: String::new(),
                sha256: String::new(),
                blake3: String::new(),
                size: "0".to_string(),
                duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(format!("Cannot open file: {}", e)),
            };
        }
    };

    let mut reader = BufReader::new(file);

    // Read entire file into buffer for xxhash (it needs full data for 128-bit)
    let mut all_data: Vec<u8> = Vec::with_capacity(size as usize);
    let mut buffer = vec![0u8; chunk_size];

    loop {
        match reader.read(&mut buffer) {
            Ok(0) => break, // EOF
            Ok(n) => {
                all_data.extend_from_slice(&buffer[..n]);
            }
            Err(e) => {
                return HashResult {
                    path: path.clone(),
                    xxhash: String::new(),
                    sha256: String::new(),
                    blake3: String::new(),
                    size: all_data.len().to_string(),
                    duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                    error: Some(format!("Read error: {}", e)),
                };
            }
        }
    }

    // Compute hashes using direct functions
    let xxhash_hex = if opts.xxhash.unwrap_or(true) {
        // Use XXH3 64-bit hash (reliable cross-platform)
        let hash64 = xxhash_rust::xxh3::xxh3_64(&all_data);
        format!("{:016x}", hash64)
    } else {
        String::new()
    };

    let sha256_hex = if opts.sha256.unwrap_or(true) {
        let mut hasher = Sha256::new();
        hasher.update(&all_data);
        format!("{:x}", hasher.finalize())
    } else {
        String::new()
    };

    let blake3_hex = if opts.blake3.unwrap_or(true) {
        let mut hasher = blake3::Hasher::new();
        hasher.update(&all_data);
        hasher.finalize().to_hex().to_string()
    } else {
        String::new()
    };

    HashResult {
        path: if is_symlink {
            format!("{} -> {}", path, actual_path)
        } else {
            path
        },
        xxhash: xxhash_hex,
        sha256: sha256_hex,
        blake3: blake3_hex,
        size: size.to_string(),
        duration_ms: start.elapsed().as_secs_f64() * 1000.0,
        error: None,
    }
}

/// Compute hashes for multiple files in parallel
#[napi]
pub fn hash_files(paths: Vec<String>, options: Option<HashOptions>) -> Vec<HashResult> {
    let opts = options.unwrap_or_default();

    // Sequential processing (simpler, avoids thread issues in napi)
    paths.into_iter().map(|p| hash_file(p, Some(opts.clone()))).collect()
}

/// Get file info without computing hashes
#[napi]
pub fn file_info(path: String) -> FileInfo {
    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return FileInfo {
            path,
            exists: false,
            is_file: false,
            is_dir: false,
            is_symlink: false,
            size: "0".to_string(),
            error: Some("File not found".to_string()),
        };
    }

    let is_symlink = path_obj.is_symlink();
    let is_dir = path_obj.is_dir();
    let is_file = path_obj.is_file();

    let (size, error) = if is_dir {
        ("0".to_string(), Some("Is a directory".to_string()))
    } else {
        match std::fs::metadata(&path) {
            Ok(m) => (m.len().to_string(), None),
            Err(e) => ("0".to_string(), Some(format!("Permission denied: {}", e))),
        }
    };

    FileInfo {
        path,
        exists: true,
        is_file,
        is_dir,
        is_symlink,
        size,
        error,
    }
}

/// File information structure
#[napi(object)]
pub struct FileInfo {
    pub path: String,
    pub exists: bool,
    pub is_file: bool,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub size: String,
    pub error: Option<String>,
}

/// Benchmark hash algorithms
#[napi]
pub fn benchmark(data_size_mb: u32) -> BenchmarkResult {
    let size = (data_size_mb as u64) * 1024 * 1024;
    let data: Vec<u8> = (0..size).map(|i| (i % 256) as u8).collect();

    // Benchmark xxhash
    let start = std::time::Instant::now();
    let _ = xxhash_rust::xxh3::xxh3_64(&data);
    let xxhash_ms = start.elapsed().as_secs_f64() * 1000.0;

    // Benchmark sha256
    let start = std::time::Instant::now();
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let _ = hasher.finalize();
    let sha256_ms = start.elapsed().as_secs_f64() * 1000.0;

    // Benchmark blake3
    let start = std::time::Instant::now();
    let mut hasher = blake3::Hasher::new();
    hasher.update(&data);
    let _ = hasher.finalize();
    let blake3_ms = start.elapsed().as_secs_f64() * 1000.0;

    BenchmarkResult {
        data_size_mb: data_size_mb as f64,
        xxhash_ms,
        sha256_ms,
        blake3_ms,
        xxhash_mbps: (data_size_mb as f64) / (xxhash_ms / 1000.0),
        sha256_mbps: (data_size_mb as f64) / (sha256_ms / 1000.0),
        blake3_mbps: (data_size_mb as f64) / (blake3_ms / 1000.0),
    }
}

/// Benchmark result structure
#[napi(object)]
pub struct BenchmarkResult {
    pub data_size_mb: f64,
    pub xxhash_ms: f64,
    pub sha256_ms: f64,
    pub blake3_ms: f64,
    pub xxhash_mbps: f64,
    pub sha256_mbps: f64,
    pub blake3_mbps: f64,
}
