import { useMemo } from 'react';

export interface YieldCalculationParams {
  principal: number;
  apy: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  compoundFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface YieldResult {
  principal: number;
  totalValue: number;
  profit: number;
  profitPercent: number;
  periodValue: number;
  apy: number;
}

export function useYieldCalculator(params: YieldCalculationParams) {
  const result = useMemo(() => {
    const { principal, apy, period, compoundFrequency = 'daily' } = params;
    
    if (principal <= 0 || apy <= 0) {
      return {
        principal,
        totalValue: principal,
        profit: 0,
        profitPercent: 0,
        periodValue: principal,
        apy,
      };
    }

    // Determine number of periods per year
    const periodsPerYear: Record<typeof compoundFrequency, number> = {
      daily: 365,
      weekly: 52,
      monthly: 12,
      yearly: 1,
    };

    // Determine number of target periods
    const periodsInTarget: Record<typeof period, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365,
    };

    const n = periodsPerYear[compoundFrequency];
    const r = apy / 100;
    const t = periodsInTarget[period] / 365;

    // Compound interest formula: A = P(1 + r/n)^(nt)
    const totalValue = principal * Math.pow(1 + r / n, n * t);
    const profit = totalValue - principal;
    const profitPercent = (profit / principal) * 100;

    return {
      principal,
      totalValue,
      profit,
      profitPercent,
      periodValue: totalValue,
      apy,
    };
  }, [params]);

  return result;
}

export function useYieldProjection(params: Omit<YieldCalculationParams, 'period'>) {
  const projections = useMemo(() => {
    const { principal, apy, compoundFrequency = 'daily' } = params;
    
    const periods: Array<{ period: string; days: number }> = [
      { period: '1 Day', days: 1 },
      { period: '1 Week', days: 7 },
      { period: '1 Month', days: 30 },
      { period: '3 Months', days: 90 },
      { period: '6 Months', days: 180 },
      { period: '1 Year', days: 365 },
    ];

    return periods.map(({ period, days }) => {
      const result = useYieldCalculator({
        principal,
        apy,
        period: days === 1 ? 'daily' : days === 7 ? 'weekly' : days === 30 ? 'monthly' : 'yearly',
        compoundFrequency,
      });
      
      return {
        period,
        days,
        ...result,
      };
    });
  }, [params]);

  return projections;
}
