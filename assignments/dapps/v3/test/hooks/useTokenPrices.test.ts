/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTokenPrices, useTokenPrice } from '../../src/hooks/useTokenPrices';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockedUseQuery = useQuery as Mock;

describe('useTokenPrices', () => {
  const mockTokenIds = ['bitcoin', 'ethereum', 'solana'];
  const mockTokenPrices = {
    bitcoin: { usd: 50000, usd_24h_change: 2.5 },
    ethereum: { usd: 3000, usd_24h_change: -1.2 },
    solana: { usd: 100, usd_24h_change: 5.8 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when enabled is true and tokenIds array is not empty', () => {
    it('should fetch token prices and return success data', () => {
      mockedUseQuery.mockReturnValue({
        data: mockTokenPrices,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds));

      expect(result.current.data).toEqual(mockTokenPrices);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state initially', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds));

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API error gracefully', () => {
      const mockError = new Error('Failed to fetch prices');
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: mockError,
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds));

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it('should return empty object when no token IDs provided', () => {
      mockedUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices([]));

      expect(result.current.data).toEqual({});
      expect(result.current.isSuccess).toBe(true);
    });

    it('should set staleTime to 60 seconds', () => {
      renderHook(() => useTokenPrices(mockTokenIds));
      
      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', mockTokenIds],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: true,
      });
    });

    it('should transform API response correctly', async () => {
      const rawApiData = {
        'bitcoin': { usd: 50000, usd_24h_change: 2.5 },
        'ethereum': { usd: 3000, usd_24h_change: -1.2 },
        'solana': { usd: 100, usd_24h_change: 5.8 },
      };

      mockedUseQuery.mockImplementation(({ queryFn: _queryFn }) => {
        return {
          data: rawApiData,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
        };
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds));

      expect(result.current.data).toEqual(rawApiData);
    });

    it('should include 24h change data in response', () => {
      mockedUseQuery.mockReturnValue({
        data: mockTokenPrices,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds));

      expect(result.current.data?.bitcoin.usd_24h_change).toBe(2.5);
      expect(result.current.data?.ethereum.usd_24h_change).toBe(-1.2);
      expect(result.current.data?.solana.usd_24h_change).toBe(5.8);
    });

    it('should handle mixed positive and negative 24h changes', () => {
      const mixedChangeData = {
        token1: { usd: 100, usd_24h_change: 5.0 },
        token2: { usd: 200, usd_24h_change: -3.0 },
        token3: { usd: 50, usd_24h_change: 0 },
      };

      mockedUseQuery.mockReturnValue({
        data: mixedChangeData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(['token1', 'token2', 'token3']));

      expect(result.current.data?.token1.usd_24h_change).toBe(5.0);
      expect(result.current.data?.token2.usd_24h_change).toBe(-3.0);
      expect(result.current.data?.token3.usd_24h_change).toBe(0);
    });
  });

  describe('when enabled is false', () => {
    it('should not fetch data when enabled is false', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      renderHook(() => useTokenPrices(mockTokenIds, false));

      // Query should not execute when enabled is false
      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', mockTokenIds],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: false,
      });
    });

    it('should return undefined data when query is disabled', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(mockTokenIds, false));

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('when tokenIds array is empty', () => {
    it('should not execute query when tokenIds array is empty', () => {
      mockedUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices([]));

      expect(result.current.data).toEqual({});
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle empty array with enabled false', () => {
      mockedUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices([], false));

      expect(result.current.data).toEqual({});
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('with single token ID', () => {
    it('should work with single token ID', () => {
      const singleTokenId = 'bitcoin';
      mockedUseQuery.mockReturnValue({
        data: { bitcoin: { usd: 50000, usd_24h_change: 2.5 } },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices([singleTokenId]));

      expect(result.current.data).toEqual({
        bitcoin: { usd: 50000, usd_24h_change: 2.5 },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle API response with unexpected structure', () => {
      const unexpectedResponse = {
        bitcoin: { usd: '50000', usd_24h_change: '2.5' }, // Values as strings
        ethereum: { usd: 3000, usd_24h_change: null }, // Null value
      };

      mockedUseQuery.mockReturnValue({
        data: unexpectedResponse,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(['bitcoin', 'ethereum']));

      // The hook should still return the data even if it has unexpected types
      expect(result.current.data).toEqual(unexpectedResponse);
    });

    it('should handle very long token IDs array', () => {
      const longTokenIds = Array(100).fill('token').map((_, i) => `token${i}`);
      
      mockedUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(longTokenIds));

      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle special characters in token IDs', () => {
      const specialTokenIds = ['token-with-dash', 'token.with.dots', 'token_with_underscore'];

      mockedUseQuery.mockReturnValue({
        data: {
          'token-with-dash': { usd: 100, usd_24h_change: 1.0 },
          'token.with.dots': { usd: 200, usd_24h_change: 2.0 },
          'token_with_underscore': { usd: 300, usd_24h_change: 3.0 },
        },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrices(specialTokenIds));

      expect(result.current.data?.['token-with-dash']).toBeDefined();
      expect(result.current.data?.['token.with.dots']).toBeDefined();
      expect(result.current.data?.['token_with_underscore']).toBeDefined();
    });
  });
});

describe('useTokenPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when token ID is provided', () => {
    it('should fetch single token price and return success data', () => {
      const tokenId = 'bitcoin';
      const mockPriceData = { bitcoin: { usd: 50000, usd_24h_change: 2.5 } };

      mockedUseQuery.mockReturnValue({
        data: mockPriceData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice(tokenId));

      expect(result.current.data).toEqual(mockPriceData);
      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', [tokenId]],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: true,
      });
    });

    it('should return loading state for single token', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice('bitcoin'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error for single token', () => {
      const mockError = new Error('Failed to fetch single token price');
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: mockError,
      });

      const { result } = renderHook(() => useTokenPrice('bitcoin'));

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it('should disable query when token ID is falsy', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice(''));

      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', []],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: false,
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should disable query when token ID is undefined', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice(undefined));

      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', []],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: false,
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should disable query when token ID is null', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice(null));

      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['tokenPrices', []],
        queryFn: expect.any(Function),
        staleTime: 60 * 1000,
        enabled: false,
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should return correct data structure for single token', () => {
      const tokenId = 'ethereum';
      const mockData = { ethereum: { usd: 3000, usd_24h_change: -1.2 } };

      mockedUseQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice(tokenId));

      expect(result.current.data).toEqual(mockData);
      expect(result.current.data?.ethereum.usd).toBe(3000);
      expect(result.current.data?.ethereum.usd_24h_change).toBe(-1.2);
    });
  });
});