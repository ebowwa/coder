//! Image metadata extraction
//!
//! Extracts EXIF, dimensions, and other metadata from image files.

use napi::bindgen_prelude::*;
use serde_json::json;

/// Image-specific metadata
#[napi(object)]
pub struct ImageMetadata {
    /// Image width in pixels
    pub width: u32,
    /// Image height in pixels
    pub height: u32,
    /// Bits per channel
    pub bits_per_channel: Option<u8>,
    /// Color space (RGB, RGBA, CMYK, etc.)
    pub color_space: Option<String>,
    /// Has alpha channel
    pub has_alpha: bool,
    /// Orientation (1-8 based on EXIF)
    pub orientation: Option<u8>,
    /// DPI for X axis
    pub dpi_x: Option<u16>,
    /// DPI for Y axis
    pub dpi_y: Option<u16>,
    /// Camera make (from EXIF)
    pub camera_make: Option<String>,
    /// Camera model (from EXIF)
    pub camera_model: Option<String>,
    /// Date taken (from EXIF)
    pub date_taken: Option<String>,
    /// GPS latitude
    pub gps_latitude: Option<f64>,
    /// GPS longitude
    pub gps_longitude: Option<f64>,
}

/// Extract metadata from an image file
#[napi]
pub fn extract_image_metadata(file_path: String) -> Result<ImageMetadata, Error> {
    use image::GenericImageView;

    let path = std::path::Path::new(&file_path);

    if !path.exists() {
        return Err(Error::from_reason(format!("File not found: {}", file_path)));
    }

    let img = image::open(path)
        .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;

    let (width, height) = img.dimensions();
    let has_alpha = img.color().has_alpha();
    let bits_per_channel = Some(img.color().bits_per_pixel() / img.color().channel_count() as u8);

    // Determine color space
    let color_space = match img.color() {
        image::ColorType::Rgb8 => Some("RGB".to_string()),
        image::ColorType::Rgba8 => Some("RGBA".to_string()),
        image::ColorType::L8 => Some("Grayscale".to_string()),
        image::ColorType::La8 => Some("Grayscale+Alpha".to_string()),
        image::ColorType::Rgb16 => Some("RGB16".to_string()),
        image::ColorType::Rgba16 => Some("RGBA16".to_string()),
        _ => None,
    };

    // Try to extract EXIF data if available
    let (orientation, dpi_x, dpi_y, camera_make, camera_model, date_taken, gps_latitude, gps_longitude) =
        extract_exif_data(&file_path)?;

    Ok(ImageMetadata {
        width,
        height,
        bits_per_channel,
        color_space,
        has_alpha,
        orientation,
        dpi_x,
        dpi_y,
        camera_make,
        camera_model,
        date_taken,
        gps_latitude,
        gps_longitude,
    })
}

/// Extract EXIF data from image
fn extract_exif_data(
    file_path: &str,
) -> Result<(
    Option<u8>,
    Option<u16>,
    Option<u16>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<f64>,
    Option<f64>,
), Error> {
    // Read file content
    let file_content = std::fs::read(file_path)
        .map_err(|e| Error::from_reason(format!("Failed to read file: {}", e)))?;

    // Try to parse EXIF data
    let exif_result = exif::Reader::new()
        .read_from_container(&mut std::io::Cursor::new(&file_content));

    match exif_result {
        Ok(exif) => {
            // Extract orientation
            let orientation = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY)
                .and_then(|f| f.value.get_uint())
                .map(|v| v as u8);

            // Extract DPI
            let dpi_x = exif.get_field(exif::Tag::XResolution, exif::In::PRIMARY)
                .and_then(|f| match &f.value {
                    exif::Value::Rational(rats) => rats.first().map(|r| r.num as u16),
                    _ => None,
                });

            let dpi_y = exif.get_field(exif::Tag::YResolution, exif::In::PRIMARY)
                .and_then(|f| match &f.value {
                    exif::Value::Rational(rats) => rats.first().map(|r| r.num as u16),
                    _ => None,
                });

            // Extract camera info
            let camera_make = exif.get_field(exif::Tag::Make, exif::In::PRIMARY)
                .and_then(|f| f.value.display_as_string().into_string().ok());

            let camera_model = exif.get_field(exif::Tag::Model, exif::In::PRIMARY)
                .and_then(|f| f.value.display_as_string().into_string().ok());

            // Extract date taken
            let date_taken = exif.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY)
                .and_then(|f| f.value.display_as_string().into_string().ok());

            // Extract GPS coordinates (simplified)
            let (gps_latitude, gps_longitude) = extract_gps_from_exif(&exif);

            Ok((orientation, dpi_x, dpi_y, camera_make, camera_model, date_taken, gps_latitude, gps_longitude))
        }
        Err(_) => Ok((None, None, None, None, None, None, None, None)),
    }
}

/// Extract GPS coordinates from EXIF data
fn extract_gps_from_exif(exif: &exif::Exif) -> (Option<f64>, Option<f64>) {
    use exif::{In, Tag};

    let lat_ref = exif.get_field(Tag::GPSLatitudeRef, In::PRIMARY);
    let lat = exif.get_field(Tag::GPSLatitude, In::PRIMARY);
    let lon_ref = exif.get_field(Tag::GPSLongitudeRef, In::PRIMARY);
    let lon = exif.get_field(Tag::GPSLongitude, In::PRIMARY);

    let latitude = lat.and_then(|f| {
        if let exif::Value::Rational(rats) = &f.value {
            if rats.len() >= 3 {
                let degrees = rats[0].to_f64().unwrap_or(0.0);
                let minutes = rats[1].to_f64().unwrap_or(0.0);
                let seconds = rats[2].to_f64().unwrap_or(0.0);
                let mut decimal = degrees + minutes / 60.0 + seconds / 3600.0;

                if let Some(ref_field) = lat_ref {
                    if let exif::Value::Ascii(ref s) = ref_field.value {
                        if s.first() == Some(&b'S') {
                            decimal = -decimal;
                        }
                    }
                }
                return Some(decimal);
            }
        }
        None
    });

    let longitude = lon.and_then(|f| {
        if let exif::Value::Rational(rats) = &f.value {
            if rats.len() >= 3 {
                let degrees = rats[0].to_f64().unwrap_or(0.0);
                let minutes = rats[1].to_f64().unwrap_or(0.0);
                let seconds = rats[2].to_f64().unwrap_or(0.0);
                let mut decimal = degrees + minutes / 60.0 + seconds / 3600.0;

                if let Some(ref_field) = lon_ref {
                    if let exif::Value::Ascii(ref s) = ref_field.value {
                        if s.first() == Some(&b'W') {
                            decimal = -decimal;
                        }
                    }
                }
                return Some(decimal);
            }
        }
        None
    });

    (latitude, longitude)
}

/// Generate a thumbnail for an image
pub fn generate_image_thumbnail(
    input_path: &str,
    output_path: &str,
    max_width: u32,
    max_height: u32,
) -> Result<(), Error> {
    let img = image::open(input_path)
        .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;

    let (width, height) = img.dimensions();

    // Calculate new dimensions maintaining aspect ratio
    let (new_width, new_height) = if width > max_width || height > max_height {
        let ratio = (max_width as f64 / width as f64).min(max_height as f64 / height as f64);
        ((width as f64 * ratio) as u32, (height as f64 * ratio) as u32)
    } else {
        (width, height)
    };

    let thumbnail = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

    thumbnail.save(output_path)
        .map_err(|e| Error::from_reason(format!("Failed to save thumbnail: {}", e)))?;

    Ok(())
}

/// Get image dimensions without loading full image
#[napi]
pub fn get_image_dimensions(file_path: String) -> Result<ImageDimensions, Error> {
    let path = std::path::Path::new(&file_path);

    let reader = image::io::Reader::open(path)
        .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;

    let (width, height) = reader.into_dimensions()
        .map_err(|e| Error::from_reason(format!("Failed to read dimensions: {}", e)))?;

    Ok(ImageDimensions {
        width,
        height,
    })
}

#[napi(object)]
pub struct ImageDimensions {
    pub width: u32,
    pub height: u32,
}

/// Convert image format
#[napi]
pub fn convert_image_format(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<(), Error> {
    let img = image::open(&input_path)
        .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;

    let output_format = match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => image::ImageFormat::Jpeg,
        "png" => image::ImageFormat::Png,
        "gif" => image::ImageFormat::Gif,
        "webp" => image::ImageFormat::WebP,
        "bmp" => image::ImageFormat::Bmp,
        _ => return Err(Error::from_reason(format!("Unsupported format: {}", format))),
    };

    img.save_with_format(&output_path, output_format)
        .map_err(|e| Error::from_reason(format!("Failed to save image: {}", e)))?;

    Ok(())
}
