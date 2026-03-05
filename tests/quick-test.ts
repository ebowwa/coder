#!/usr/bin/env bun
/**
 * Quick test for ammCalculateCost and quantStdDev
 */

import {
  ammCalculateCost,
  quantStdDev,
  quantVersion,
  isQuantAvailable
} from '../packages/src/native/index.js';

console.log('=== Quick Test ===\n');

// Check if quant module is available
console.log('Quant module available:', isQuantAvailable());
console.log('Quant version:', quantVersion());
console.log();

// Test 1: ammCalculateCost(500, 500, 'no', 50)
console.log('Test 1: ammCalculateCost(500, 500, "no", 50)');
try {
  const cost = ammCalculateCost(500, 500, 'no', 50);
  console.log('Result:', cost);
  console.log('Expected: Cost to buy 50 NO shares when poolYes=500, poolNo=500');
} catch (error) {
  console.error('Error:', error);
}
console.log();

// Test 2: quantStdDev([1,2,3,4,5])
console.log('Test 2: quantStdDev([1,2,3,4,5])');
try {
  const stdDev = quantStdDev([1, 2, 3, 4, 5]);
  console.log('Result:', stdDev);
  console.log('Expected: ~1.414 (standard deviation of 1,2,3,4,5)');
} catch (error) {
  console.error('Error:', error);
}
console.log();
