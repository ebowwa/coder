//! Media metadata extraction
//!
//! Extracts metadata from images, audio, and video files
//! using Rust libraries for performance.

mod image;
mod audio;
mod video;

use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};

pub use image::*;
pub use audio::*;
pub use video::*;

/// Generic media metadata result
#[napi(object)]
pub struct MediaMetadata {
    /// MIME type
    pub mime_type: String,
    /// File size in bytes
    pub size: u64,
    /// Width (for images/videos)
    pub width: Option<u32>,
    /// Height (for images/videos)
    pub height: Option<u32>,
    /// Duration in seconds (for audio/video)
    pub duration: Option<f64>,
    /// Bitrate in kbps
    pub bitrate: Option<u32>,
    /// Codec information
    pub codec: Option<String>,
    /// Additional metadata as JSON string
    pub extra: Option<String>,
}

/// Extract metadata from a media file
#[napi]
pub fn extract_media_metadata(file_path: String) -> Result<MediaMetadata, Error> {
    let path = std::path::Path::new(&file_path);

    if !path.exists() {
        return Err(Error::from_reason(format!("File not found: {}", file_path)));
    }

    let metadata = std::fs::metadata(path)
        .map_err(|e| Error::from_reason(format!("Failed to read file metadata: {}", e)))?;

    let mime_type = mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string();

    let size = metadata.len();

    // Extract type-specific metadata
    let (width, height, duration, bitrate, codec, extra) = match mime_type.as_str() {
        "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/bmp" => {
            extract_image_metadata(&file_path)?
        }
        "video/mp4" | "video/webm" | "video/quicktime" | "video/x-msvideo" => {
            extract_video_metadata(&file_path)?
        }
        "audio/mpeg" | "audio/wav" | "audio/ogg" | "audio/webm" => {
            extract_audio_metadata(&file_path)?
        }
        _ => (None, None, None, None, None, None),
    };

    Ok(MediaMetadata {
        mime_type,
        size,
        width,
        height,
        duration,
        bitrate,
        codec,
        extra,
    })
}

/// Batch extract metadata from multiple files
#[napi]
pub fn extract_media_metadata_batch(
    file_paths: Vec<String>,
) -> Result<Vec<MediaMetadata>, Error> {
    let mut results = Vec::with_capacity(file_paths.len());

    for path in file_paths {
        match extract_media_metadata(path) {
            Ok(metadata) => results.push(metadata),
            Err(e) => {
                // Return error metadata for failed extractions
                results.push(MediaMetadata {
                    mime_type: "application/octet-stream".to_string(),
                    size: 0,
                    width: None,
                    height: None,
                    duration: None,
                    bitrate: None,
                    codec: None,
                    extra: Some(format!("{{\"error\": \"{}\"}}", e.reason)),
                });
            }
        }
    }

    Ok(results)
}

/// Generate thumbnail for an image
#[napi]
pub fn generate_thumbnail(
    input_path: String,
    output_path: String,
    max_width: u32,
    max_height: u32,
) -> Result<(), Error> {
    // This would use image crate to resize
    // For now, return a placeholder
    generate_image_thumbnail(&input_path, &output_path, max_width, max_height)
}

/// Check if a file is a valid media type
#[napi]
pub fn is_valid_media_type(file_path: String) -> Result<bool> {
    let path = std::path::Path::new(&file_path);

    if !path.exists() {
        return Ok(false);
    }

    let mime = mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string();

    let is_media = mime.starts_with("image/")
        || mime.starts_with("video/")
        || mime.starts_with("audio/");

    Ok(is_media)
}
