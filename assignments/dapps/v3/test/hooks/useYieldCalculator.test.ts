/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useYieldCalculator, useYieldProjection } from '../../src/hooks/useYieldCalculator';

describe('useYieldCalculator', () => {
  describe('basic calculations', () => {
    it('should calculate daily yield correctly', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 10,
          period: 'daily',
          compoundFrequency: 'daily',
        })
      );

      expect(result.current.principal).toBe(1000);
      expect(result.current.totalValue).toBeGreaterThan(1000);
      expect(result.current.profit).toBeGreaterThan(0);
      expect(result.current.apy).toBe(10);
    });

    it('should calculate yearly yield correctly', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 10,
          period: 'yearly',
          compoundFrequency: 'yearly',
        })
      );

      // 10% APY on $1000 with yearly compounding = $100 profit
      expect(result.current.profit).toBeCloseTo(100, 0);
      expect(result.current.totalValue).toBeCloseTo(1100, 0);
    });

    it('should return zero profit for zero principal', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 0,
          apy: 10,
          period: 'yearly',
          compoundFrequency: 'daily',
        })
      );

      expect(result.current.profit).toBe(0);
      expect(result.current.totalValue).toBe(0);
    });

    it('should return zero profit for zero APY', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 0,
          period: 'yearly',
          compoundFrequency: 'daily',
        })
      );

      expect(result.current.profit).toBe(0);
      expect(result.current.totalValue).toBe(1000);
    });
  });

  describe('compound frequency effects', () => {
    it('should compound daily for higher returns', () => {
      const { result: daily } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 10,
          period: 'yearly',
          compoundFrequency: 'daily',
        })
      );

      const { result: yearly } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 10,
          period: 'yearly',
          compoundFrequency: 'yearly',
        })
      );

      expect(daily.current.profit).toBeGreaterThan(yearly.current.profit);
    });

    it('should calculate monthly compounding', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 12,
          period: 'yearly',
          compoundFrequency: 'monthly',
        })
      );

      expect(result.current.profit).toBeGreaterThan(0);
      expect(result.current.totalValue).toBeGreaterThan(1000);
    });
  });

  describe('different periods', () => {
    it('should calculate weekly yield', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 52,
          period: 'weekly',
          compoundFrequency: 'weekly',
        })
      );

      // Weekly yield should be much less than yearly
      expect(result.current.profit).toBeLessThan(50);
    });

    it('should calculate monthly yield', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 12,
          period: 'monthly',
          compoundFrequency: 'monthly',
        })
      );

      // Monthly yield should be about 1% for 12% APY
      expect(result.current.profitPercent).toBeCloseTo(1, 0);
    });
  });

  describe('profit percentage', () => {
    it('should calculate correct profit percentage', () => {
      const { result } = renderHook(() =>
        useYieldCalculator({
          principal: 1000,
          apy: 5,
          period: 'yearly',
          compoundFrequency: 'yearly',
        })
      );

      expect(result.current.profitPercent).toBeCloseTo(5, 1);
    });
  });
});

describe('useYieldProjection', () => {
  it('should project yields for multiple periods', () => {
    const { result } = renderHook(() =>
      useYieldProjection({
        principal: 1000,
        apy: 10,
        compoundFrequency: 'daily',
      })
    );

    expect(result.current).toHaveLength(6);
    expect(result.current[0].period).toBe('1 Day');
    expect(result.current[5].period).toBe('1 Year');
  });

  it('should show increasing returns over time', () => {
    const { result } = renderHook(() =>
      useYieldProjection({
        principal: 1000,
        apy: 10,
        compoundFrequency: 'daily',
      })
    );

    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i].totalValue).toBeGreaterThanOrEqual(result.current[i - 1].totalValue);
    }
  });

  it('should handle zero APY', () => {
    const { result } = renderHook(() =>
      useYieldProjection({
        principal: 1000,
        apy: 0,
        compoundFrequency: 'daily',
      })
    );

    expect(result.current).toHaveLength(6);
    result.current.forEach(projection => {
      expect(projection.profit).toBe(0);
      expect(projection.totalValue).toBe(1000);
    });
  });
});
