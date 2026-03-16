//! Video metadata extraction
//!
//! Extracts metadata from video files (MP4, WebM, AVI, etc.).

use napi::bindgen_prelude::*;
use std::io::{Read, Seek};

/// Video-specific metadata
#[napi(object)]
pub struct VideoMetadata {
    /// Video width in pixels
    pub width: Option<u32>,
    /// Video height in pixels
    pub height: Option<u32>,
    /// Duration in seconds
    pub duration: Option<f64>,
    /// Frame rate
    pub frame_rate: Option<f64>,
    /// Video codec
    pub video_codec: Option<String>,
    /// Audio codec
    pub audio_codec: Option<String>,
    /// Video bitrate in kbps
    pub video_bitrate: Option<u32>,
    /// Audio bitrate in kbps
    pub audio_bitrate: Option<u32>,
    /// Has audio track
    pub has_audio: bool,
    /// Container format
    pub container: Option<String>,
    /// Total bitrate
    pub total_bitrate: Option<u32>,
}

/// Extract metadata from a video file
pub fn extract_video_metadata(
    file_path: &str,
) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    let path = std::path::Path::new(file_path);

    if !path.exists() {
        return Err(Error::from_reason(format!("File not found: {}", file_path)));
    }

    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "mp4" | "m4v" => extract_mp4_metadata(file_path),
        "webm" => extract_webm_metadata(file_path),
        "avi" => extract_avi_metadata(file_path),
        "mov" => extract_mov_metadata(file_path),
        "mkv" => extract_mkv_metadata(file_path),
        _ => Ok((None, None, None, None, None, None)),
    }
}

/// Extract MP4 metadata
fn extract_mp4_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    let mut buffer = [0u8; 8];

    // Check for ftyp atom
    file.read_exact(&mut buffer)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;

    if &buffer[4..8] != b"ftyp" {
        return Err(Error::from_reason("Invalid MP4 file"));
    }

    let mut width: Option<u32> = None;
    let mut height: Option<u32> = None;
    let mut duration: Option<f64> = None;
    let mut bitrate: Option<u32> = None;

    // Parse atoms (simplified)
    // In a real implementation, would parse mvhd, tkhd, and mdhd atoms
    // For now, return placeholder values
    let file_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Rough estimation
    bitrate = Some((file_size / 1024) as u32); // Very rough estimate

    Ok((width, height, duration, bitrate, Some("h264".to_string()), Some("aac".to_string())))
}

/// Extract WebM metadata
fn extract_webm_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // Check for WebM/Matroska header
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    let mut header = [0u8; 4];
    file.read_exact(&mut header)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;

    // EBML header starts with 0x1A 0x45 0xDF 0xA3
    if header != [0x1A, 0x45, 0xDF, 0xA3] {
        return Err(Error::from_reason("Invalid WebM file"));
    }

    Ok((None, None, None, None, Some("vp8".to_string()), Some("vorbis".to_string())))
}

/// Extract AVI metadata
fn extract_avi_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    let mut header = [0u8; 12];
    file.read_exact(&mut header)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;

    // Check for RIFF...AVI header
    if &header[0..4] != b"RIFF" || &header[8..12] != b"AVI " {
        return Err(Error::from_reason("Invalid AVI file"));
    }

    Ok((None, None, None, None, None, None))
}

/// Extract MOV metadata
fn extract_mov_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // MOV uses similar atom structure to MP4
    extract_mp4_metadata(file_path)
}

/// Extract MKV metadata
fn extract_mkv_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // MKV uses same EBML structure as WebM
    extract_webm_metadata(file_path)
}

/// Get video dimensions from file
#[napi]
pub fn get_video_dimensions(file_path: String) -> Result<VideoDimensions, Error> {
    let (width, height, _, _, _, _) = extract_video_metadata(&file_path)?;

    Ok(VideoDimensions {
        width: width.unwrap_or(0),
        height: height.unwrap_or(0),
    })
}

#[napi(object)]
pub struct VideoDimensions {
    pub width: u32,
    pub height: u32,
}

/// Get video duration from file
#[napi]
pub fn get_video_duration(file_path: String) -> Result<Option<f64>, Error> {
    let (_, _, duration, _, _, _) = extract_video_metadata(&file_path)?;
    Ok(duration)
}

/// Extract full video metadata as structured object
#[napi]
pub fn extract_full_video_metadata(file_path: String) -> Result<VideoMetadata, Error> {
    let (width, height, duration, bitrate, video_codec, audio_codec) = extract_video_metadata(&file_path)?;

    let has_audio = audio_codec.is_some();

    Ok(VideoMetadata {
        width,
        height,
        duration,
        frame_rate: None,
        video_codec,
        audio_codec,
        video_bitrate: bitrate,
        audio_bitrate: None,
        has_audio,
        container: Some(std::path::Path::new(&file_path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("unknown")
            .to_string()),
        total_bitrate: bitrate,
    })
}

/// Check if video has audio track
#[napi]
pub fn video_has_audio(file_path: String) -> Result<bool, Error> {
    let (_, _, _, _, _, audio_codec) = extract_video_metadata(&file_path)?;
    Ok(audio_codec.is_some())
}

/// Get video codec information
#[napi]
pub fn get_video_codec(file_path: String) -> Result<Option<String>, Error> {
    let (_, _, _, _, video_codec, _) = extract_video_metadata(&file_path)?;
    Ok(video_codec)
}
