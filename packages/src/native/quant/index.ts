/**
 * Quant Module
 * Financial calculations using @ebowwa/quant-rust native library
 *
 * @module native/quant
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { dlopen, FFIType, ptr } from "bun:ffi";
import { existsSync } from "fs";

// Type imports
import type {
  OHLCV,
  AMMState,
  AMMCostResult,
  AMMPriceImpactResult,
  LMSRPriceResult,
  ArbitrageResult,
  OddsConversion,
} from "../types/index.js";

// FFI pool imports
import { acquireFloat64Buffer, acquireDualFloat64Buffers } from "../ffi-pool.js";

// Re-export pool management
export { getPoolStats, warmupPools, destroyPools } from "../ffi-pool.js";

// ============================================================================
// Quant Module Interface
// ============================================================================

/**
 * Quant module interface for financial calculations
 * Loads from @ebowwa/quant-rust native library
 */
interface QuantModule {
  quant_version: () => string;
  quant_last_error: () => string;
  quant_clear_error: () => void;

  // OHLCV
  quant_ohlcv_new: (timestamp: bigint, open: number, high: number, low: number, close: number, volume: number) => string;

  // AMM
  quant_amm_new: (poolYes: number, poolNo: number, fee: number) => string;
  quant_amm_calculate_cost: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;
  quant_amm_price_impact: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;

  // LMSR
  quant_lmsr_price: (yesShares: number, noShares: number, b: number) => string;
  quant_lmsr_cost: (yesShares: number, noShares: number, b: number, buyYes: boolean, shares: number) => string;

  // Arbitrage
  quant_detect_arbitrage: (yesPrice: number, noPrice: number) => string;

  // Odds
  quant_convert_odds: (value: number, fromType: number) => string;

  // Statistics (ptr can be Float64Array or raw pointer number)
  quant_mean: (ptr: Float64Array | number, len: number) => number;
  quant_std_dev: (ptr: Float64Array | number, len: number) => number;
  quant_variance: (ptr: Float64Array | number, len: number) => number;
  quant_correlation: (ptrX: Float64Array | number, ptrY: Float64Array | number, len: number) => number;

  // Memory
  quant_free_string: (ptr: number) => void;
}

let quantModule: QuantModule | null = null;

// ============================================================================
// Module Loading
// ============================================================================

/**
 * Load the quant native module from @ebowwa/quant-rust
 */
function loadQuant(): QuantModule | null {
  if (quantModule) return quantModule;

  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Try multiple paths for the quant library
  const libName = process.platform === "darwin"
    ? "libquant_rust.dylib"
    : process.platform === "linux"
    ? "libquant_rust.so"
    : "quant_rust.dll";

  const platformArch = `${process.platform}-${process.arch}`;

  const possiblePaths = [
    // Coder package node_modules (4 levels up from quant/ to coder root)
    join(__dirname, "..", "..", "..", "..", "node_modules", "@ebowwa", "quant-rust", "native", platformArch, libName),
    // Monorepo root node_modules (6 levels up)
    join(__dirname, "..", "..", "..", "..", "..", "..", "node_modules", "@ebowwa", "quant-rust", "native", platformArch, libName),
    // Bundled dist location
    join(__dirname, "..", "native", platformArch, libName),
    // Development build in target (4 levels up)
    join(__dirname, "..", "..", "..", "..", "node_modules", "@ebowwa", "quant-rust", "target", "release", libName),
  ];

  for (const libPath of possiblePaths) {
    try {
      const exists = existsSync(libPath);
      if (process.env.DEBUG_QUANT) {
        console.log(`[quant] Checking: ${libPath} → ${exists ? 'EXISTS' : 'not found'}`);
      }
      if (!exists) continue;

      const lib = dlopen(libPath, {
        quant_version: { returns: FFIType.cstring, args: [] },
        quant_last_error: { returns: FFIType.cstring, args: [] },
        quant_clear_error: { returns: FFIType.void, args: [] },
        quant_ohlcv_new: { returns: FFIType.cstring, args: [FFIType.u64, FFIType.f64, FFIType.f64, FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_amm_new: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_amm_calculate_cost: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_amm_price_impact: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_lmsr_price: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_lmsr_cost: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_detect_arbitrage: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64] },
        quant_convert_odds: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.i32] },
        quant_mean: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.u64] },
        quant_std_dev: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.u64] },
        quant_variance: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.u64] },
        quant_correlation: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.ptr, FFIType.u64] },
        quant_free_string: { returns: FFIType.void, args: [FFIType.ptr] },
      });

      quantModule = lib.symbols as unknown as QuantModule;
      return quantModule;
    } catch {
      continue;
    }
  }

  return null;
}

// ============================================================================
// Module Instance
// ============================================================================

/** Loaded quant module instance */
export const quant = loadQuant();

// ============================================================================
// Helper Functions
// ============================================================================

function parseQuantJson<T>(response: string | null): T {
  if (!response) {
    throw new Error(quant?.quant_last_error() || "Unknown quant error");
  }
  return JSON.parse(response) as T;
}

/** Warn once when using JS fallback */
let quantFallbackWarned = false;
function warnQuantFallback(): void {
  if (!quantFallbackWarned) {
    console.warn("\x1b[33m[quant] WARNING: Rust native module not loaded, using JS fallback\x1b[0m");
    quantFallbackWarned = true;
  }
}

// ============================================================================
// Export Functions
// ============================================================================

/** Get quant library version */
export function quantVersion(): string {
  if (!quant) {
    warnQuantFallback();
    return "JS_FALLBACK (rust failed)";
  }
  return quant.quant_version();
}

/** Check if quant native module is available */
export function isQuantAvailable(): boolean {
  return quant !== null;
}

// ----- OHLCV -----

/** Create OHLCV candle data */
export function createOHLCV(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): OHLCV {
  if (!quant) {
    warnQuantFallback();
    return { timestamp, open, high, low, close, volume };
  }
  const response = quant.quant_ohlcv_new(BigInt(timestamp), open, high, low, close, volume);
  return parseQuantJson(response);
}

// ----- AMM -----

/** Create AMM (Automated Market Maker) state */
export function createAMM(poolYes: number, poolNo: number, fee: number): AMMState {
  if (!quant) {
    warnQuantFallback();
    const k = poolYes * poolNo;
    return {
      pool_yes: poolYes,
      pool_no: poolNo,
      k,
      fee,
      price_yes: poolNo / k,
      price_no: poolYes / k,
    };
  }
  const response = quant.quant_amm_new(poolYes, poolNo, fee);
  return parseQuantJson(response);
}

/** Calculate AMM cost for buying shares */
export function ammCalculateCost(
  poolYes: number,
  poolNo: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): number {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const k = poolYes * poolNo;
    if (buyYes) {
      return (k / (poolYes + shares)) - poolNo;
    }
    return (k / (poolNo + shares)) - poolYes;
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_amm_calculate_cost(poolYes, poolNo, buyYes, shares);
  const result = parseQuantJson<AMMCostResult>(response);
  return Math.abs(result.cost);
}

/** Calculate AMM price impact */
export function ammPriceImpact(
  poolYes: number,
  poolNo: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): AMMPriceImpactResult {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const k = poolYes * poolNo;
    const priceBefore = buyYes ? poolNo / k : poolYes / k;
    const newPoolYes = buyYes ? poolYes + shares : poolYes;
    const newPoolNo = buyYes ? poolNo : poolNo + shares;
    const priceAfter = buyYes ? newPoolNo / k : newPoolYes / k;
    return {
      price_before: priceBefore,
      price_after: priceAfter,
      price_impact: Math.abs(priceAfter - priceBefore) / priceBefore,
      slippage: Math.abs(priceAfter - priceBefore),
    };
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_amm_price_impact(poolYes, poolNo, buyYes, shares);
  return parseQuantJson(response);
}

// ----- LMSR -----

/** Calculate LMSR price */
export function lmsrPrice(yesShares: number, noShares: number, b: number): LMSRPriceResult {
  if (!quant) {
    warnQuantFallback();
    const expYes = Math.exp(yesShares / b);
    const expNo = Math.exp(noShares / b);
    const sum = expYes + expNo;
    return { yes_price: expYes / sum, no_price: expNo / sum, spread: Math.abs(expYes - expNo) / sum };
  }
  const response = quant.quant_lmsr_price(yesShares, noShares, b);
  return parseQuantJson(response);
}

/** Calculate LMSR cost */
export function lmsrCost(
  yesShares: number,
  noShares: number,
  b: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): AMMCostResult {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const costBefore = b * Math.log(Math.exp(yesShares / b) + Math.exp(noShares / b));
    const newYes = buyYes ? yesShares + shares : yesShares;
    const newNo = buyYes ? noShares : noShares + shares;
    const costAfter = b * Math.log(Math.exp(newYes / b) + Math.exp(newNo / b));
    return { cost: costAfter - costBefore, avg_price: (costAfter - costBefore) / shares };
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_lmsr_cost(yesShares, noShares, b, buyYes, shares);
  return parseQuantJson(response);
}

// ----- Arbitrage -----

/** Detect arbitrage opportunity */
export function detectArbitrage(yesPrice: number, noPrice: number): ArbitrageResult {
  if (!quant) {
    warnQuantFallback();
    const total = yesPrice + noPrice;
    return {
      has_arbitrage: total < 1,
      yes_price: yesPrice,
      no_price: noPrice,
      total,
      profit_per_share: total < 1 ? 1 - total : 0,
    };
  }
  const response = quant.quant_detect_arbitrage(yesPrice, noPrice);
  return parseQuantJson(response);
}

// ----- Odds Conversion -----

const ODDS_TYPE_MAP: Record<string, number> = {
  probability: 0,
  decimal: 1,
  american: 2,
};

/** Convert odds between formats */
export function convertOdds(value: number, fromType: "probability" | "decimal" | "american"): OddsConversion {
  if (!quant) {
    warnQuantFallback();
    let prob: number;
    switch (fromType) {
      case "probability": prob = value; break;
      case "decimal": prob = 1 / value; break;
      case "american": prob = value > 0 ? 100 / (value + 100) : -value / (-value + 100); break;
    }
    const americanOdds = prob >= 0.5 ? Math.round(-100 / (prob - 1)) : Math.round((1 - prob) / prob * 100);
    return { probability: prob, decimal_odds: 1 / prob, american_odds: americanOdds };
  }
  const response = quant.quant_convert_odds(value, ODDS_TYPE_MAP[fromType] ?? 0);
  return parseQuantJson(response);
}

// ----- Statistics -----

/** Calculate mean */
export function quantMean(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const { array, release } = acquireFloat64Buffer(data);
  try {
    return quant.quant_mean(array, data.length);
  } finally {
    release();
  }
}

/** Calculate standard deviation */
export function quantStdDev(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    const m = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(data.reduce((sum, x) => sum + (x - m) ** 2, 0) / data.length);
  }
  const { array, release } = acquireFloat64Buffer(data);
  try {
    return quant.quant_std_dev(array, data.length);
  } finally {
    release();
  }
}

/** Calculate variance */
export function quantVariance(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    const m = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sum, x) => sum + (x - m) ** 2, 0) / data.length;
  }
  const { array, release } = acquireFloat64Buffer(data);
  try {
    return quant.quant_variance(array, data.length);
  } finally {
    release();
  }
}

/** Calculate correlation */
export function quantCorrelation(x: number[], y: number[]): number {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) return NaN;
  if (!quant) {
    warnQuantFallback();
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0) / n;
    const vx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0) / n;
    const vy = y.reduce((s, yi) => s + (yi - my) ** 2, 0) / n;
    return cov / Math.sqrt(vx * vy);
  }
  const { arrayX, arrayY, release } = acquireDualFloat64Buffers(x, y);
  try {
    return quant.quant_correlation(arrayX, arrayY, x.length);
  } finally {
    release();
  }
}
