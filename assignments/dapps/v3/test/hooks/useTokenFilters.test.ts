/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTokenFilters, type TokenFilters } from '../../src/hooks/useTokenFilters';
import type { Token } from '../../src/types/market';

describe('useTokenFilters', () => {
  const mockTokens: Token[] = [
    {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 50000,
      price_change_percentage_24h: 2.5,
      market_cap: 1000000000000,
      total_volume: 50000000000,
    },
    {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      current_price: 3000,
      price_change_percentage_24h: -1.2,
      market_cap: 300000000000,
      total_volume: 20000000000,
    },
    {
      id: 'tether',
      symbol: 'usdt',
      name: 'Tether',
      current_price: 1,
      price_change_percentage_24h: 0.01,
      market_cap: 80000000000,
      total_volume: 40000000000,
    },
  ];

  describe('search filtering', () => {
    it('should filter by symbol', () => {
      const filters: TokenFilters = { search: 'btc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('bitcoin');
    });

    it('should filter by name', () => {
      const filters: TokenFilters = { search: 'ethereum' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('ethereum');
    });

    it('should be case insensitive', () => {
      const filters: TokenFilters = { search: 'BTC' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1);
    });

    it('should return all tokens when search is empty', () => {
      const filters: TokenFilters = { search: '' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(3);
    });
  });

  describe('price filtering', () => {
    it('should filter by minimum price', () => {
      const filters: TokenFilters = { minPrice: 1000 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(2);
      expect(result.current.every(t => t.current_price >= 1000)).toBe(true);
    });

    it('should filter by maximum price', () => {
      const filters: TokenFilters = { maxPrice: 100 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('tether');
    });

    it('should filter by price range', () => {
      const filters: TokenFilters = { minPrice: 1, maxPrice: 5000 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(2);
    });
  });

  describe('market cap filtering', () => {
    it('should filter by minimum market cap', () => {
      const filters: TokenFilters = { minMarketCap: 500000000000 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1); // Only BTC has > 500B market cap
      expect(result.current[0].id).toBe('bitcoin');
    });
  });

  describe('24h change filtering', () => {
    it('should filter by minimum 24h change', () => {
      const filters: TokenFilters = { minChange24h: 0 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      // BTC (2.5) and USDT (0.01) both have >= 0 change
      expect(result.current.length).toBeGreaterThanOrEqual(1);
      expect(result.current[0].id).toBe('bitcoin');
    });

    it('should filter by maximum 24h change', () => {
      const filters: TokenFilters = { maxChange24h: 0 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      // Only ETH (-1.2) and USDT (0.01) have <= 0 change
      expect(result.current.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sorting', () => {
    it('should sort by market cap descending', () => {
      const filters: TokenFilters = { sortBy: 'market_cap', sortOrder: 'desc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current[0].id).toBe('bitcoin');
      expect(result.current[2].id).toBe('tether');
    });

    it('should sort by market cap ascending', () => {
      const filters: TokenFilters = { sortBy: 'market_cap', sortOrder: 'asc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current[0].id).toBe('tether');
      expect(result.current[2].id).toBe('bitcoin');
    });

    it('should sort by price', () => {
      const filters: TokenFilters = { sortBy: 'price', sortOrder: 'desc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current[0].id).toBe('bitcoin');
      expect(result.current[2].id).toBe('tether');
    });

    it('should sort by 24h change', () => {
      const filters: TokenFilters = { sortBy: 'change_24h', sortOrder: 'desc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current[0].id).toBe('bitcoin');
      expect(result.current[2].id).toBe('ethereum');
    });

    it('should sort by volume', () => {
      const filters: TokenFilters = { sortBy: 'volume', sortOrder: 'desc' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current[0].id).toBe('bitcoin');
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters together', () => {
      const filters: TokenFilters = {
        search: 'btc',
        minPrice: 1000,
        sortBy: 'market_cap',
        sortOrder: 'desc',
      };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('bitcoin');
    });
  });

  describe('empty results', () => {
    it('should return empty array when no tokens match', () => {
      const filters: TokenFilters = { search: 'nonexistent' };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(0);
    });

    it('should return empty array when filters exclude all tokens', () => {
      const filters: TokenFilters = { minPrice: 1000000 };
      const { result } = renderHook(() => useTokenFilters(mockTokens, filters));
      expect(result.current).toHaveLength(0);
    });
  });
});
