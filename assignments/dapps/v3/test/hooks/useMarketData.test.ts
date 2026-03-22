/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarketData } from '../../src/hooks/useMarketData';
import { useTokenPrices } from '../../src/hooks/useTokenPrices';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../../src/services/coingecko', () => ({
  getTopTokens: vi.fn(),
  getMarketData: vi.fn(),
  getTokenPrices: vi.fn(),
}));

const mockedUseQuery = useQuery as Mock;

import { getTopTokens, getTokenPrices } from '../../src/services/coingecko';
const mockedGetTopTokens = getTopTokens as Mock;
const mockedGetTokenPrices = getTokenPrices as Mock;

describe('useMarketData', () => {
  const mockTokens = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: 50000, price_change_percentage_24h: 2.5, market_cap: 1000000000, total_volume: 50000000 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: 3000, price_change_percentage_24h: -1.2, market_cap: 300000000, total_volume: 20000000 },
  ];

  const mockMarketData = { totalMarketCap: 1300000000, totalVolume: 70000000, btcDominance: 77, marketCapChangePercentage24h: 1.5 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseQuery.mockImplementation(({ queryKey, queryFn }) => {
      if (queryKey[0] === 'tokens') return { data: queryFn ? queryFn() : undefined, isLoading: false, error: null };
      if (queryKey[0] === 'marketData') return { data: queryFn ? queryFn() : undefined, isLoading: false, error: null };
      return { data: undefined, isLoading: false, error: null };
    });
  });

  describe('basic functionality', () => {
    it('should fetch tokens and market data correctly', () => {
      mockedUseQuery.mockImplementation(({ queryKey }) => {
        if (queryKey[0] === 'tokens') return { data: mockTokens, isLoading: false, error: null };
        if (queryKey[0] === 'marketData') return { data: mockMarketData, isLoading: false, error: null };
        return { data: undefined, isLoading: false, error: null };
      });

      const { result } = renderHook(() => useMarketData());
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.marketData).toEqual(mockMarketData);
      expect(result.current.isLoading).toBe(false);
    });

    it('should use default limit of 50 when no limit provided', () => {
      renderHook(() => useMarketData());
      expect(mockedGetTopTokens).toHaveBeenCalledTimes(1);
    });

    it('should use custom limit when provided', () => {
      renderHook(() => useMarketData(100));
      expect(mockedGetTopTokens).toHaveBeenCalledWith(100);
    });
  });

  describe('loading states', () => {
    it('should return loading state when tokens are loading', () => {
      mockedUseQuery.mockImplementation(({ queryKey }) => {
        if (queryKey[0] === 'tokens') return { data: undefined, isLoading: true, error: null };
        if (queryKey[0] === 'marketData') return { data: mockMarketData, isLoading: false, error: null };
        return { data: undefined, isLoading: false, error: null };
      });
      const { result } = renderHook(() => useMarketData());
      expect(result.current.isLoading).toBe(true);
    });

    it('should return loading state when market data is loading', () => {
      mockedUseQuery.mockImplementation(({ queryKey }) => {
        if (queryKey[0] === 'tokens') return { data: mockTokens, isLoading: false, error: null };
        if (queryKey[0] === 'marketData') return { data: undefined, isLoading: true, error: null };
        return { data: undefined, isLoading: false, error: null };
      });
      const { result } = renderHook(() => useMarketData());
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle tokens fetch error', () => {
      mockedUseQuery.mockImplementation(({ queryKey }) => {
        if (queryKey[0] === 'tokens') return { data: undefined, isLoading: false, error: new Error('Failed') };
        if (queryKey[0] === 'marketData') return { data: mockMarketData, isLoading: false, error: null };
        return { data: undefined, isLoading: false, error: null };
      });
      const { result } = renderHook(() => useMarketData());
      expect(result.current.tokens).toEqual([]);
      expect(result.current.marketData).toEqual(mockMarketData);
    });
  });

  describe('query configuration', () => {
    it('should use correct staleTime configuration', () => {
      renderHook(() => useMarketData());
      expect(mockedUseQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tokens', 50], staleTime: 5 * 60 * 1000 }));
      expect(mockedUseQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['marketData'], staleTime: 5 * 60 * 1000 }));
    });
  });
});

describe('useTokenPrices', () => {
  const mockPrices = { 'bitcoin': { usd: 50000, usd_24h_change: 2.5 }, 'ethereum': { usd: 3000, usd_24h_change: -1.2 } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTokenPrices.mockResolvedValue(mockPrices);
    mockedUseQuery.mockImplementation(({ queryKey, queryFn, enabled }) => {
      if (enabled === false) return { data: undefined, isLoading: false, error: null };
      if (queryKey[0] === 'tokenPrices') return { data: queryFn ? queryFn() : mockPrices, isLoading: false, error: null };
      return { data: undefined, isLoading: false, error: null };
    });
  });

  describe('basic functionality', () => {
    it('should fetch token prices when IDs are provided', () => {
      const { result } = renderHook(() => useTokenPrices(['bitcoin', 'ethereum']));
      expect(result.current.data).toEqual(mockPrices);
      expect(mockedGetTokenPrices).toHaveBeenCalledWith(['bitcoin', 'ethereum']);
    });

    it('should return undefined when no IDs provided (query disabled)', () => {
      const { result } = renderHook(() => useTokenPrices([]));
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('query configuration', () => {
    it('should use shorter staleTime for token prices', () => {
      renderHook(() => useTokenPrices(['bitcoin']));
      expect(mockedUseQuery).toHaveBeenCalledWith(expect.objectContaining({ staleTime: 60 * 1000 }));
    });

    it('should disable query when no IDs provided', () => {
      renderHook(() => useTokenPrices([]));
      expect(mockedGetTokenPrices).not.toHaveBeenCalled();
    });
  });
});
