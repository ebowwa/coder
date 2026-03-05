#!/usr/bin/env bun
/**
 * Test script for quant module functions
 */

import {
  ammCalculateCost,
  detectArbitrage,
  quantMean,
  quantVersion,
  isQuantAvailable
} from '../packages/src/native/index.js';

console.log('=== Quant Module Test ===\n');

// Check if quant module is available
console.log('Quant module available:', isQuantAvailable());
console.log('Quant version:', quantVersion());
console.log();

// Test 1: ammCalculateCost(1000, 1000, 'yes', 100)
console.log('Test 1: ammCalculateCost(1000, 1000, "yes", 100)');
try {
  const cost = ammCalculateCost(1000, 1000, 'yes', 100);
  console.log('Result:', cost);
  console.log('Expected: Cost to buy 100 YES shares when poolYes=1000, poolNo=1000');
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test 2: detectArbitrage(0.45, 0.45)
console.log('Test 2: detectArbitrage(0.45, 0.45)');
try {
  const arb = detectArbitrage(0.45, 0.45);
  console.log('Result:', JSON.stringify(arb, null, 2));
  console.log('Expected: Has arbitrage since 0.45 + 0.45 = 0.90 < 1.0');
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test 3: quantMean([1, 2, 3, 4, 5])
console.log('Test 3: quantMean([1, 2, 3, 4, 5])');
try {
  const mean = quantMean([1, 2, 3, 4, 5]);
  console.log('Result:', mean);
  console.log('Expected: 3.0 (average of 1,2,3,4,5)');
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Additional tests for verification
console.log('=== Additional Tests ===\n');

// Test AMM cost for NO shares
console.log('Test 4: ammCalculateCost(1000, 1000, "no", 100)');
try {
  const cost = ammCalculateCost(1000, 1000, 'no', 100);
  console.log('Result:', cost);
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test no arbitrage scenario
console.log('Test 5: detectArbitrage(0.55, 0.55)');
try {
  const arb = detectArbitrage(0.55, 0.55);
  console.log('Result:', JSON.stringify(arb, null, 2));
  console.log('Expected: No arbitrage since 0.55 + 0.55 = 1.10 > 1.0');
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test mean with empty array
console.log('Test 6: quantMean([])');
try {
  const mean = quantMean([]);
  console.log('Result:', mean);
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test mean with negative numbers
console.log('Test 7: quantMean([-5, 0, 5, 10])');
try {
  const mean = quantMean([-5, 0, 5, 10]);
  console.log('Result:', mean);
  console.log('Expected: 2.5');
} catch (error) {
  console.error('Error:', error);
}
console.log();
