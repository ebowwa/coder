#!/usr/bin/env bun
/**
 * Quant Conversation Demo
 *
 * Demonstrates using @ebowwa/coder with quant functions for
 * AI-powered quantitative analysis conversations.
 */

import {
  quantMean,
  quantStdDev,
  quantVariance,
  quantCorrelation,
  type OHLCV,
  type AMMState,
} from "../packages/src/native/index.js";

// Sample market data
const prices = [100.5, 101.2, 102.8, 101.9, 103.5, 104.2, 103.8, 105.1, 104.5, 106.0];
const volumes = [1000, 1200, 950, 1100, 1300, 800, 1150, 1400, 900, 1250];

// Calculate statistics using pooled FFI buffers
console.log("=== Quant Statistics (using pooled FFI buffers) ===\n");

const meanPrice = quantMean(prices);
const stdDevPrice = quantStdDev(prices);
const variancePrice = quantVariance(prices);
const correlation = quantCorrelation(prices, volumes);

console.log(`Price Analysis:`);
console.log(`  Mean: $${meanPrice.toFixed(2)}`);
console.log(`  Std Dev: $${stdDevPrice.toFixed(4)}`);
console.log(`  Variance: ${variancePrice.toFixed(4)}`);
console.log(`\nPrice-Volume Correlation: ${correlation.toFixed(4)}`);

// Sample OHLCV data
const ohlcvData: OHLCV[] = [
  { timestamp: Date.now() - 86400000 * 5, open: 100, high: 102, low: 99, close: 101, volume: 1000 },
  { timestamp: Date.now() - 86400000 * 4, open: 101, high: 104, low: 100, close: 103, volume: 1200 },
  { timestamp: Date.now() - 86400000 * 3, open: 103, high: 105, low: 102, close: 104, volume: 900 },
  { timestamp: Date.now() - 86400000 * 2, open: 104, high: 106, low: 103, close: 105, volume: 1500 },
  { timestamp: Date.now() - 86400000, open: 105, high: 107, low: 104, close: 106, volume: 1100 },
];

// Calculate returns
const closes = ohlcvData.map((d) => d.close);
const returns = closes.slice(1).map((c, i) => (c - closes[i]!) / closes[i]!);

console.log(`\nReturns Analysis:`);
console.log(`  Mean Return: ${(quantMean(returns) * 100).toFixed(2)}%`);
console.log(`  Volatility (Std Dev): ${(quantStdDev(returns) * 100).toFixed(2)}%`);

// AMM State example
const ammState: AMMState = {
  pool_yes: 50000,
  pool_no: 50000,
  k: 2500000000,
  fee: 0.02,
  price_yes: 0.5,
  price_no: 0.5,
};

console.log(`\nAMM State:`);
console.log(`  YES Pool: ${ammState.pool_yes.toLocaleString()}`);
console.log(`  NO Pool: ${ammState.pool_no.toLocaleString()}`);
console.log(`  YES Price: $${ammState.price_yes.toFixed(2)}`);
console.log(`  NO Price: $${ammState.price_no.toFixed(2)}`);
console.log(`  Fee: ${(ammState.fee * 100).toFixed(1)}%`);

// Performance note
console.log(`\n=== Performance Note ===`);
console.log(`All quant functions use pooled FFI buffers from @ebowwa/bun-native-page`);
console.log(`This reduces GC pressure for high-frequency trading applications.`);

// Example conversation context
console.log(`\n=== Conversation Context for AI ===`);
console.log(`
The AI assistant can use these quant functions for analysis:

1. quantMean(data: number[]) - Calculate mean
2. quantStdDev(data: number[]) - Calculate standard deviation
3. quantVariance(data: number[]) - Calculate variance
4. quantCorrelation(x: number[], y: number[]) - Calculate correlation

Example prompts for the AI:
- "Analyze the volatility of this price series"
- "Calculate the correlation between price and volume"
- "What's the risk profile of this asset?"

The pooled buffer implementation ensures minimal GC overhead
during high-frequency analysis operations.
`);
