use sha2::{Sha256, Sha512, Digest};
use md5::Md5;
use std::hash::Hasher;
use twox_hash::XxHash64;
use super::HashResult;

pub fn calculate_hash(content: &str, algorithm: Option<&str>) -> anyhow::Result<HashResult> {
    let algo = algorithm.unwrap_or("sha256");

    let hash = match algo.to_lowercase().as_str() {
        "sha256" => {
            let mut hasher = Sha256::new();
            Digest::update(&mut hasher, content.as_bytes());
            let result = hasher.finalize();
            hex::encode(result)
        }
        "sha512" => {
            let mut hasher = Sha512::new();
            Digest::update(&mut hasher, content.as_bytes());
            let result = hasher.finalize();
            hex::encode(result)
        }
        "md5" => {
            let mut hasher = Md5::new();
            Digest::update(&mut hasher, content.as_bytes());
            let result = hasher.finalize();
            hex::encode(result)
        }
        "xxh64" => {
            let mut hasher = XxHash64::default();
            hasher.write(content.as_bytes());
            let result = hasher.finish();
            format!("{:016x}", result)
        }
        _ => return Err(anyhow::anyhow!("Unsupported algorithm: {}", algo)),
    };

    Ok(HashResult {
        hash,
        algorithm: algo.to_string(),
    })
}
