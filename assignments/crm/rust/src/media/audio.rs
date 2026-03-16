//! Audio metadata extraction
//!
//! Extracts metadata from audio files (MP3, WAV, OGG, FLAC, etc.).

use napi::bindgen_prelude::*;
use std::io::{Read, Seek, SeekFrom};

/// Audio-specific metadata
#[napi(object)]
pub struct AudioMetadata {
    /// Duration in seconds
    pub duration: Option<f64>,
    /// Sample rate in Hz
    pub sample_rate: Option<u32>,
    /// Number of channels
    pub channels: Option<u16>,
    /// Bits per sample
    pub bits_per_sample: Option<u16>,
    /// Bitrate in kbps
    pub bitrate: Option<u32>,
    /// Codec/format
    pub codec: Option<String>,
    /// Title (from ID3/Vorbis comments)
    pub title: Option<String>,
    /// Artist (from ID3/Vorbis comments)
    pub artist: Option<String>,
    /// Album (from ID3/Vorbis comments)
    pub album: Option<String>,
    /// Track number
    pub track_number: Option<u16>,
    /// Year
    pub year: Option<u16>,
    /// Genre
    pub genre: Option<String>,
}

/// Extract metadata from an audio file
pub fn extract_audio_metadata(
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
        "mp3" => extract_mp3_metadata(file_path),
        "wav" => extract_wav_metadata(file_path),
        "ogg" | "oga" => extract_ogg_metadata(file_path),
        "flac" => extract_flac_metadata(file_path),
        "m4a" | "mp4" | "aac" => extract_mp4_audio_metadata(file_path),
        _ => Ok((None, None, None, None, None, None)),
    }
}

/// Extract MP3 metadata (ID3 tags and technical info)
fn extract_mp3_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // Read file for basic analysis
    let file = std::fs::File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    let mut reader = std::io::BufReader::new(file);

    // Try to find MP3 frame header
    let mut buffer = [0u8; 4];
    let mut frame_found = false;
    let mut sample_rate: Option<u32> = None;
    let mut bitrate: Option<u32> = None;
    let mut channels: Option<u16> = None;

    // Search for MP3 frame sync
    loop {
        match reader.read_exact(&mut buffer) {
            Ok(()) => {
                // MP3 frame sync: 0xFF followed by 0xE0-0xFF
                if buffer[0] == 0xFF && (buffer[1] & 0xE0) == 0xE0 {
                    frame_found = true;

                    // Parse header
                    let version = (buffer[1] >> 3) & 0x03;
                    let layer = (buffer[1] >> 1) & 0x03;
                    let bitrate_index = (buffer[2] >> 4) & 0x0F;
                    let sample_rate_index = (buffer[2] >> 2) & 0x03;
                    let channel_mode = (buffer[3] >> 6) & 0x03;

                    // Sample rate lookup (simplified for MPEG1 Layer 3)
                    sample_rate = match (version, sample_rate_index) {
                        (3, 0) => Some(44100), // MPEG1
                        (3, 1) => Some(48000),
                        (3, 2) => Some(32000),
                        _ => None,
                    };

                    // Bitrate lookup (simplified)
                    bitrate = match (version, layer, bitrate_index) {
                        (3, 1, i) if i > 0 && i < 15 => Some(get_mp3_bitrate(i)),
                        _ => None,
                    };

                    channels = match channel_mode {
                        3 => Some(1), // Mono
                        _ => Some(2), // Stereo/Joint stereo
                    };

                    break;
                }
            }
            Err(_) => break,
        }
    }

    // Duration estimation (rough)
    let duration = if frame_found && bitrate.is_some() && sample_rate.is_some() {
        let file_metadata = std::fs::metadata(file_path).ok();
        file_metadata.map(|m| {
            let size = m.len();
            let br = bitrate.unwrap() as u64;
            if br > 0 {
                Some((size * 8) as f64 / (br * 1000) as f64)
            } else {
                None
            }
        }).unwrap_or(None)
    } else {
        None
    };

    Ok((sample_rate, channels, duration, bitrate, Some("mp3".to_string()), None))
}

/// Get MP3 bitrate from index
fn get_mp3_bitrate(index: u8) -> u32 {
    const BITRATES: [u32; 14] = [
        0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320
    ];
    BITRATES.get(index as usize).copied().unwrap_or(128)
}

/// Extract WAV metadata
fn extract_wav_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    // Read WAV header
    let mut header = [0u8; 44];
    file.read_exact(&mut header)
        .map_err(|e| Error::from_reason(format!("Failed to read WAV header: {}", e)))?;

    // Check RIFF header
    if &header[0..4] != b"RIFF" || &header[8..12] != b"WAVE" {
        return Err(Error::from_reason("Invalid WAV file"));
    }

    // Find fmt chunk
    let channels = u16::from_le_bytes([header[22], header[23]]);
    let sample_rate = u32::from_le_bytes([header[24], header[25], header[26], header[27]]);
    let bits_per_sample = u16::from_le_bytes([header[34], header[35]]);

    // Calculate bitrate
    let bitrate = if bits_per_sample > 0 && channels > 0 {
        Some(sample_rate * channels as u32 * bits_per_sample as u32 / 1000)
    } else {
        None
    };

    // Get file size for duration calculation
    let file_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Find data chunk size (skip to it)
    let data_size = file_size - 44; // Approximate

    let duration = if bitrate.is_some() && bitrate.unwrap() > 0 {
        Some((data_size * 8) as f64 / (bitrate.unwrap() * 1000) as f64)
    } else {
        None
    };

    Ok((Some(sample_rate), Some(channels), duration, bitrate, Some("pcm".to_string()), None))
}

/// Extract OGG Vorbis metadata (placeholder)
fn extract_ogg_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // Simplified - would need ogg/vorbis library for full implementation
    Ok((None, None, None, None, Some("vorbis".to_string()), None))
}

/// Extract FLAC metadata (placeholder)
fn extract_flac_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // Simplified - would need flac library for full implementation
    Ok((None, None, None, None, Some("flac".to_string()), None))
}

/// Extract MP4/AAC metadata (placeholder)
fn extract_mp4_audio_metadata(file_path: &str) -> Result<(
    Option<u32>,
    Option<u32>,
    Option<f64>,
    Option<u32>,
    Option<String>,
    Option<String>,
), Error> {
    // Simplified - would need mp4parse library for full implementation
    Ok((None, None, None, None, Some("aac".to_string()), None))
}

/// Get audio duration from file
#[napi]
pub fn get_audio_duration(file_path: String) -> Result<Option<f64>, Error> {
    let (sample_rate, channels, duration, _, _, _) = extract_audio_metadata(&file_path)?;
    Ok(duration)
}

/// Extract full audio metadata as structured object
#[napi]
pub fn extract_full_audio_metadata(file_path: String) -> Result<AudioMetadata, Error> {
    let (sample_rate, channels, duration, bitrate, codec, _) = extract_audio_metadata(&file_path)?;

    Ok(AudioMetadata {
        duration,
        sample_rate,
        channels: channels,
        bits_per_sample: None,
        bitrate,
        codec,
        title: None,
        artist: None,
        album: None,
        track_number: None,
        year: None,
        genre: None,
    })
}
