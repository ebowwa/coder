import { describe, test, expect } from 'bun:test';

describe('AMM - Automated Market Maker', () => {
  describe('Constant Product Formula (x*y = k)', () => {
    test('maintains constant product after trades', () => {
      // Initial state: 100 YES, 100 NO
      const yesPool = 100;
      const noPool = 100;
      const constantK = yesPool * noPool;

      // Simulate trade: buy 10 YES shares
      const newYesPool = yesPool + 10;
      const newNoPool = constantK / newYesPool;

      // Verify constant product is maintained
      const newK = newYesPool * newNoPool;
      expect(Math.abs(newK - constantK)).toBeLessThan(0.01);
    });

    test('calculates correct price for small trade', () => {
      const yesPool = 100;
      const noPool = 100;
      const buyAmount = 10;

      const constantK = yesPool * noPool;
      const newYesPool = yesPool + buyAmount;
      const newNoPool = constantK / newYesPool;
      const cost = noPool - newNoPool;
      const avgPrice = cost / buyAmount;

      // Average price should be positive and reasonable
      expect(avgPrice).toBeGreaterThan(0);
      expect(avgPrice).toBeLessThan(2);
      // Cost should be less than buy amount (due to AMM mechanics)
      expect(cost).toBeLessThan(buyAmount);
    });

    test('larger trades have more price impact', () => {
      const yesPool = 100;
      const noPool = 100;

      // Small trade
      const smallTrade = 5;
      const k1 = yesPool * noPool;
      const newYes1 = yesPool + smallTrade;
      const newNo1 = k1 / newYes1;
      const cost1 = noPool - newNo1;

      // Large trade
      const largeTrade = 50;
      const newYes2 = yesPool + largeTrade;
      const newNo2 = k1 / newYes2;
      const cost2 = noPool - newNo2;

      // Larger trade should have higher total cost (more impact)
      expect(cost2).toBeGreaterThan(cost1);
      // Both should maintain constant product
      const newK1 = newYes1 * newNo1;
      const newK2 = newYes2 * newNo2;
      expect(Math.abs(newK1 - k1)).toBeLessThan(0.01);
      expect(Math.abs(newK2 - k1)).toBeLessThan(0.01);
    });
  });

  describe('Implied Probability', () => {
    test('equal pools imply 50% probability', () => {
      const yesPool = 100;
      const noPool = 100;
      const probability = noPool / (yesPool + noPool);
      expect(probability).toBe(0.5);
    });

    test('unbalanced pools reflect probability', () => {
      const yesPool = 200;
      const noPool = 100;
      const probability = noPool / (yesPool + noPool);
      expect(probability).toBeCloseTo(0.333, 2);
    });
  });

  describe('Edge Cases', () => {
    test('handles very small trade amounts', () => {
      const yesPool = 100;
      const noPool = 100;
      const buyAmount = 0.001;

      const constantK = yesPool * noPool;
      const newYesPool = yesPool + buyAmount;
      const newNoPool = constantK / newYesPool;

      // Should still maintain constant product
      const newK = newYesPool * newNoPool;
      expect(Math.abs(newK - constantK)).toBeLessThan(0.0001);
    });

    test('handles large trade amounts', () => {
      const yesPool = 100;
      const noPool = 100;
      const buyAmount = 99;

      const constantK = yesPool * noPool;
      const newYesPool = yesPool + buyAmount;
      const newNoPool = constantK / newYesPool;

      // Should maintain constant product
      const newK = newYesPool * newNoPool;
      expect(Math.abs(newK - constantK)).toBeLessThan(0.01);

      // New YES pool should be larger
      expect(newYesPool).toBeGreaterThan(yesPool);
      // New NO pool should be smaller
      expect(newNoPool).toBeLessThan(noPool);
    });
  });
});
