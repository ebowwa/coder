// Quantitative analysis functions for financial/statistical data
//
// This module provides both:
// - napi-rs bindings for Node.js/Bun via napi-rs
// - FFI exports for direct Bun FFI calls (zero-copy with pooled buffers)

use napi::bindgen_prelude::*;
use std::slice;

// ============================================================================
// Internal Helper Functions
// ============================================================================

fn internal_mean(data: &[f64]) -> f64 {
    if data.is_empty() {
        return f64::NAN;
    }
    data.iter().sum::<f64>() / data.len() as f64
}

fn internal_variance(data: &[f64]) -> f64 {
    if data.is_empty() {
        return f64::NAN;
    }
    let mean = internal_mean(data);
    data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / data.len() as f64
}

fn internal_std_dev(data: &[f64]) -> f64 {
    internal_variance(data).sqrt()
}

fn internal_correlation(x: &[f64], y: &[f64]) -> f64 {
    if x.len() != y.len() || x.is_empty() {
        return f64::NAN;
    }
    let n = x.len();
    let mean_x = internal_mean(x);
    let mean_y = internal_mean(y);

    let cov: f64 = x.iter()
        .zip(y.iter())
        .map(|(xi, yi)| (xi - mean_x) * (yi - mean_y))
        .sum::<f64>() / n as f64;

    let var_x = internal_variance(x);
    let var_y = internal_variance(y);

    if var_x == 0.0 || var_y == 0.0 {
        return 0.0;
    }

    cov / (var_x * var_y).sqrt()
}

// ============================================================================
// FFI Exports for Bun (zero-copy with pooled buffers)
// ============================================================================

/// Calculate mean of a Float64Array
/// # Safety: ptr must be a valid pointer to len f64 values
#[no_mangle]
pub extern "C" fn quant_mean(ptr: *const f64, len: usize) -> f64 {
    if ptr.is_null() || len == 0 {
        return f64::NAN;
    }
    let data = unsafe { slice::from_raw_parts(ptr, len) };
    internal_mean(data)
}

/// Calculate standard deviation of a Float64Array
/// # Safety: ptr must be a valid pointer to len f64 values
#[no_mangle]
pub extern "C" fn quant_std_dev(ptr: *const f64, len: usize) -> f64 {
    if ptr.is_null() || len == 0 {
        return f64::NAN;
    }
    let data = unsafe { slice::from_raw_parts(ptr, len) };
    internal_std_dev(data)
}

/// Calculate variance of a Float64Array
/// # Safety: ptr must be a valid pointer to len f64 values
#[no_mangle]
pub extern "C" fn quant_variance(ptr: *const f64, len: usize) -> f64 {
    if ptr.is_null() || len == 0 {
        return f64::NAN;
    }
    let data = unsafe { slice::from_raw_parts(ptr, len) };
    internal_variance(data)
}

/// Calculate correlation between two Float64Arrays
/// # Safety: ptr_x and ptr_y must be valid pointers to len f64 values each
#[no_mangle]
pub extern "C" fn quant_correlation(ptr_x: *const f64, ptr_y: *const f64, len: usize) -> f64 {
    if ptr_x.is_null() || ptr_y.is_null() || len == 0 {
        return f64::NAN;
    }
    let x = unsafe { slice::from_raw_parts(ptr_x, len) };
    let y = unsafe { slice::from_raw_parts(ptr_y, len) };
    internal_correlation(x, y)
}

/// Get library version
#[no_mangle]
pub extern "C" fn quant_version() -> *mut std::os::raw::c_char {
    let version = std::ffi::CString::new(env!("CARGO_PKG_VERSION")).unwrap();
    version.into_raw()
}

/// Free a string returned by this library
/// # Safety: ptr must be a valid pointer from a previous call
#[no_mangle]
pub extern "C" fn quant_free_string(ptr: *mut std::os::raw::c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = std::ffi::CString::from_raw(ptr);
        }
    }
}

// ============================================================================
// napi-rs Bindings (for Node.js/Bun via napi)
// ============================================================================

/// Descriptive statistics for a dataset
#[napi(object)]
pub struct DescriptiveStats {
    /// Number of data points
    pub count: u32,
    /// Arithmetic mean (average)
    pub mean: f64,
    /// Median (middle value)
    pub median: f64,
    /// Standard deviation (population)
    pub std_dev: f64,
    /// Standard deviation (sample)
    pub std_dev_sample: f64,
    /// Variance (population)
    pub variance: f64,
    /// Minimum value
    pub min: f64,
    /// Maximum value
    pub max: f64,
    /// Range (max - min)
    pub range: f64,
    /// Sum of all values
    pub sum: f64,
}

/// Volatility analysis for price data
#[napi(object)]
pub struct VolatilityAnalysis {
    /// Simple volatility (std dev of returns)
    pub volatility: f64,
    /// Annualized volatility (assuming daily data, 252 trading days)
    pub annualized_volatility: f64,
    /// Average daily return
    pub avg_return: f64,
    /// Return standard deviation
    pub return_std_dev: f64,
    /// Coefficient of variation (std_dev / mean)
    pub coefficient_of_variation: f64,
    /// Price range as percentage of mean
    pub price_range_pct: f64,
    /// Number of positive returns
    pub positive_returns: u32,
    /// Number of negative returns
    pub negative_returns: u32,
    /// Win rate (positive returns / total)
    pub win_rate: f64,
}

/// Calculate descriptive statistics for a dataset
#[napi]
pub fn calculate_descriptive_stats(data: Vec<f64>) -> Result<DescriptiveStats> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate statistics on empty dataset"));
    }

    let count = data.len();
    let sum: f64 = data.iter().sum();
    let mean = sum / count as f64;

    // Calculate variance (population)
    let variance: f64 = data.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / count as f64;

    // Sample variance (n-1 denominator)
    let variance_sample = if count > 1 {
        data.iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>() / (count - 1) as f64
    } else {
        0.0
    };

    let std_dev = variance.sqrt();
    let std_dev_sample = variance_sample.sqrt();

    // Calculate median
    let mut sorted = data.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = if count % 2 == 0 {
        (sorted[count / 2 - 1] + sorted[count / 2]) / 2.0
    } else {
        sorted[count / 2]
    };

    let min = data.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let range = max - min;

    Ok(DescriptiveStats {
        count: count as u32,
        mean,
        median,
        std_dev,
        std_dev_sample,
        variance,
        min,
        max,
        range,
        sum,
    })
}

/// Calculate mean (average) of a dataset
#[napi]
pub fn calculate_mean(data: Vec<f64>) -> Result<f64> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate mean of empty dataset"));
    }

    let sum: f64 = data.iter().sum();
    Ok(sum / data.len() as f64)
}

/// Calculate standard deviation (population)
#[napi]
pub fn calculate_std_dev(data: Vec<f64>) -> Result<f64> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate std dev of empty dataset"));
    }

    let mean = calculate_mean(data.clone())?;
    let variance: f64 = data.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / data.len() as f64;

    Ok(variance.sqrt())
}

/// Calculate standard deviation (sample, n-1 denominator)
#[napi]
pub fn calculate_std_dev_sample(data: Vec<f64>) -> Result<f64> {
    if data.len() < 2 {
        return Err(Error::from_reason("Need at least 2 data points for sample std dev"));
    }

    let mean = calculate_mean(data.clone())?;
    let variance: f64 = data.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / (data.len() - 1) as f64;

    Ok(variance.sqrt())
}

/// Calculate variance (population)
#[napi]
pub fn calculate_variance(data: Vec<f64>) -> Result<f64> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate variance of empty dataset"));
    }

    let mean = calculate_mean(data.clone())?;
    let variance: f64 = data.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / data.len() as f64;

    Ok(variance)
}

/// Calculate median (middle value)
#[napi]
pub fn calculate_median(data: Vec<f64>) -> Result<f64> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate median of empty dataset"));
    }

    let mut sorted = data;
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let count = sorted.len();
    let median = if count % 2 == 0 {
        (sorted[count / 2 - 1] + sorted[count / 2]) / 2.0
    } else {
        sorted[count / 2]
    };

    Ok(median)
}

/// Calculate percentage returns from price data
#[napi]
pub fn calculate_returns(prices: Vec<f64>) -> Result<Vec<f64>> {
    if prices.len() < 2 {
        return Err(Error::from_reason("Need at least 2 prices to calculate returns"));
    }

    let returns: Vec<f64> = prices
        .windows(2)
        .map(|window| (window[1] - window[0]) / window[0])
        .collect();

    Ok(returns)
}

/// Analyze volatility of price data
#[napi]
pub fn analyze_volatility(prices: Vec<f64>) -> Result<VolatilityAnalysis> {
    if prices.len() < 2 {
        return Err(Error::from_reason("Need at least 2 prices for volatility analysis"));
    }

    // Calculate returns
    let returns = calculate_returns(prices.clone())?;

    // Return statistics
    let return_stats = calculate_descriptive_stats(returns.clone())?;
    let price_stats = calculate_descriptive_stats(prices)?;

    // Count positive and negative returns
    let positive_returns = returns.iter().filter(|&&r| r > 0.0).count() as u32;
    let negative_returns = returns.iter().filter(|&&r| r < 0.0).count() as u32;
    let win_rate = positive_returns as f64 / returns.len() as f64;

    // Annualized volatility (assuming daily data, ~252 trading days)
    let annualized_volatility = return_stats.std_dev_sample * (252_f64).sqrt();

    // Coefficient of variation
    let coefficient_of_variation = if price_stats.mean != 0.0 {
        price_stats.std_dev / price_stats.mean.abs()
    } else {
        0.0
    };

    // Price range as percentage of mean
    let price_range_pct = if price_stats.mean != 0.0 {
        price_stats.range / price_stats.mean.abs()
    } else {
        0.0
    };

    Ok(VolatilityAnalysis {
        volatility: return_stats.std_dev_sample,
        annualized_volatility,
        avg_return: return_stats.mean,
        return_std_dev: return_stats.std_dev_sample,
        coefficient_of_variation,
        price_range_pct,
        positive_returns,
        negative_returns,
        win_rate,
    })
}

/// Calculate moving average
#[napi]
pub fn calculate_sma(data: Vec<f64>, period: u32) -> Result<Vec<f64>> {
    if period == 0 {
        return Err(Error::from_reason("Period must be greater than 0"));
    }

    if data.len() < period as usize {
        return Err(Error::from_reason("Data length must be >= period"));
    }

    let period = period as usize;
    let mut sma = Vec::with_capacity(data.len() - period + 1);

    for i in period..=data.len() {
        let window = &data[i - period..i];
        let avg = window.iter().sum::<f64>() / period as f64;
        sma.push(avg);
    }

    Ok(sma)
}

/// Calculate exponential moving average
#[napi]
pub fn calculate_ema(data: Vec<f64>, period: u32) -> Result<Vec<f64>> {
    if period == 0 {
        return Err(Error::from_reason("Period must be greater than 0"));
    }

    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate EMA of empty dataset"));
    }

    let period = period as usize;
    let multiplier = 2.0 / (period as f64 + 1.0);

    let mut ema = Vec::with_capacity(data.len());

    // First EMA value is SMA
    let first_sma: f64 = data.iter().take(period.min(data.len())).sum::<f64>()
        / period.min(data.len()) as f64;
    ema.push(first_sma);

    // Calculate EMA for remaining values
    for i in 1..data.len() {
        let prev_ema = ema[i - 1];
        let current_ema = (data[i] - prev_ema) * multiplier + prev_ema;
        ema.push(current_ema);
    }

    Ok(ema)
}

/// Calculate z-scores (how many std devs from mean)
#[napi]
pub fn calculate_z_scores(data: Vec<f64>) -> Result<Vec<f64>> {
    if data.len() < 2 {
        return Err(Error::from_reason("Need at least 2 data points for z-scores"));
    }

    let mean = calculate_mean(data.clone())?;
    let std_dev = calculate_std_dev_sample(data.clone())?;

    if std_dev == 0.0 {
        return Ok(vec![0.0; data.len()]);
    }

    let z_scores: Vec<f64> = data.iter().map(|x| (x - mean) / std_dev).collect();

    Ok(z_scores)
}

/// Normalize data to 0-1 range
#[napi]
pub fn normalize_data(data: Vec<f64>) -> Result<Vec<f64>> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot normalize empty dataset"));
    }

    let min = data.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let range = max - min;

    if range == 0.0 {
        return Ok(vec![0.5; data.len()]);
    }

    let normalized: Vec<f64> = data.iter().map(|x| (x - min) / range).collect();

    Ok(normalized)
}

/// Calculate percentile value
#[napi]
pub fn calculate_percentile(data: Vec<f64>, percentile: f64) -> Result<f64> {
    if data.is_empty() {
        return Err(Error::from_reason("Cannot calculate percentile of empty dataset"));
    }

    if percentile < 0.0 || percentile > 100.0 {
        return Err(Error::from_reason("Percentile must be between 0 and 100"));
    }

    let mut sorted = data;
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let rank = (percentile / 100.0) * (sorted.len() - 1) as f64;
    let lower = rank.floor() as usize;
    let upper = (lower + 1).min(sorted.len() - 1);
    let fraction = rank - lower as f64;

    Ok(sorted[lower] * (1.0 - fraction) + sorted[upper] * fraction)
}

/// Calculate covariance between two datasets
#[napi]
pub fn calculate_covariance(data1: Vec<f64>, data2: Vec<f64>) -> Result<f64> {
    if data1.len() != data2.len() {
        return Err(Error::from_reason("Datasets must have equal length"));
    }

    if data1.is_empty() {
        return Err(Error::from_reason("Cannot calculate covariance of empty datasets"));
    }

    let mean1 = calculate_mean(data1.clone())?;
    let mean2 = calculate_mean(data2.clone())?;

    let covariance: f64 = data1.iter()
        .zip(data2.iter())
        .map(|(x, y)| (x - mean1) * (y - mean2))
        .sum::<f64>() / data1.len() as f64;

    Ok(covariance)
}

/// Calculate correlation coefficient between two datasets
#[napi]
pub fn calculate_correlation(data1: Vec<f64>, data2: Vec<f64>) -> Result<f64> {
    if data1.len() != data2.len() {
        return Err(Error::from_reason("Datasets must have equal length"));
    }

    if data1.len() < 2 {
        return Err(Error::from_reason("Need at least 2 data points for correlation"));
    }

    let covariance = calculate_covariance(data1.clone(), data2.clone())?;
    let std_dev1 = calculate_std_dev(data1)?;
    let std_dev2 = calculate_std_dev(data2)?;

    if std_dev1 == 0.0 || std_dev2 == 0.0 {
        return Ok(0.0);
    }

    Ok(covariance / (std_dev1 * std_dev2))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mean() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let mean = internal_mean(&data);
        assert!((mean - 3.0).abs() < 0.0001);
    }

    #[test]
    fn test_std_dev() {
        let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        let std_dev = internal_std_dev(&data);
        assert!((std_dev - 2.0).abs() < 0.0001);
    }

    #[test]
    fn test_correlation() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        let corr = internal_correlation(&x, &y);
        assert!((corr - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_ffi_mean() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let mean = quant_mean(data.as_ptr(), data.len());
        assert!((mean - 3.0).abs() < 0.0001);
    }
}
