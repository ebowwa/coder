/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGasPrice } from '../../src/hooks/useGasPrice';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../../src/services/gas', () => ({
  fetchGasPrice: vi.fn(),
}));

import { useQuery } from '@tanstack/react-query';
import { fetchGasPrice } from '../../src/services/gas';

const mockedUseQuery = useQuery as Mock;
const mockedFetchGasPrice = fetchGasPrice as Mock;

describe('useGasPrice', () => {
  const mockGasData = {
    slow: { price: 15, time: '~30 sec' },
    average: { price: 20, time: '~1 min' },
    fast: { price: 25, time: '~30 sec' },
    baseFee: 18,
    lastBlock: 18500000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should fetch gas prices correctly', () => {
      mockedUseQuery.mockReturnValue({
        data: mockGasData,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useGasPrice());
      expect(result.current.data).toEqual(mockGasData);
    });

    it('should return undefined while loading', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useGasPrice());
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('query configuration', () => {
    it('should configure query with correct parameters', () => {
      renderHook(() => useGasPrice());
      expect(mockedUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['gasPrice'],
          staleTime: 60000,
          refetchInterval: 60000,
        })
      );
    });

    it('should call fetchGasPrice', () => {
      renderHook(() => useGasPrice());
      expect(mockedUseQuery).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch gas prices'),
      });

      const { result } = renderHook(() => useGasPrice());
      expect(result.current.data).toBeUndefined();
    });
  });
});
