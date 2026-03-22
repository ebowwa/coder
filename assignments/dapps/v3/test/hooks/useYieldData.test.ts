/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useYieldData } from '../../src/hooks/useYieldData';
import { useQuery } from '@tanstack/react-query';
import { getYieldData } from '../../src/services/defillama';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../../src/services/defillama', () => ({
  getYieldData: vi.fn(),
}));

const mockedUseQuery = useQuery as Mock;
const mockedGetYieldData = getYieldData as Mock;

describe('useYieldData', () => {
  const mockYieldData = [
    {
      chain: 'Ethereum',
      project: 'Aave',
      tvl: 10000000,
      apy: 3.5,
      pool: '0x123',
    },
    {
      chain: 'Polygon',
      project: 'Aave',
      tvl: 5000000,
      apy: 5.2,
      pool: '0x456',
    },
    {
      chain: 'Ethereum',
      project: 'Compound',
      tvl: 8000000,
      apy: 4.1,
      pool: '0x789',
    },
    {
      chain: 'Arbitrum',
      project: 'Curve',
      tvl: 3000000,
      apy: 2.8,
      pool: '0xabc',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when query is loading', () => {
    it('should return loading state', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData());

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state with chain filter', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('Ethereum'));

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('when query is successful', () => {
    beforeEach(() => {
      mockedGetYieldData.mockResolvedValue(mockYieldData);
    });

    it('should return all yield data when no chain filter is provided', async () => {
      mockedUseQuery.mockReturnValue({
        data: mockYieldData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockYieldData);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should filter data by chain when chain filter is provided', async () => {
      const expectedFilteredData = mockYieldData.filter(
        (item) => item.chain.toLowerCase() === 'ethereum'
      );

      mockedUseQuery.mockReturnValue({
        data: expectedFilteredData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('Ethereum'));

      await waitFor(() => {
        expect(result.current.data).toEqual(expectedFilteredData);
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.every(item => item.chain === 'Ethereum')).toBe(true);
      });
    });

    it('should filter data by chain case-insensitively', async () => {
      const expectedFilteredData = mockYieldData.filter(
        (item) => item.chain.toLowerCase() === 'polygon'
      );

      mockedUseQuery.mockReturnValue({
        data: expectedFilteredData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('POLYGON'));

      await waitFor(() => {
        expect(result.current.data).toEqual(expectedFilteredData);
        expect(result.current.data?.every(item => item.chain === 'Polygon')).toBe(true);
      });
    });

    it('should return empty array when no pools match the chain filter', async () => {
      mockedUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('NonExistentChain'));

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
        expect(result.current.data).toHaveLength(0);
      });
    });

    it('should maintain TVL and APY values correctly', async () => {
      const expectedFilteredData = mockYieldData.filter(
        (item) => item.chain.toLowerCase() === 'ethereum'
      );

      mockedUseQuery.mockReturnValue({
        data: expectedFilteredData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('Ethereum'));

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].tvl).toBe(10000000);
        expect(result.current.data?.[0].apy).toBe(3.5);
        expect(result.current.data?.[1].tvl).toBe(8000000);
        expect(result.current.data?.[1].apy).toBe(4.1);
      });
    });
  });

  describe('when query fails', () => {
    const mockError = new Error('Network error');

    beforeEach(() => {
      mockedGetYieldData.mockRejectedValue(mockError);
    });

    it('should return error state', async () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: mockError,
      });

      const { result } = renderHook(() => useYieldData());

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(mockError);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return error state with chain filter', async () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: mockError,
      });

      const { result } = renderHook(() => useYieldData('Ethereum'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(mockError);
      });
    });
  });

  describe('when API returns empty array', () => {
    beforeEach(() => {
      mockedGetYieldData.mockResolvedValue([]);
    });

    it('should return empty array with no chain filter', async () => {
      mockedUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData());

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should return empty array with chain filter', async () => {
      mockedUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData('Ethereum'));

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('query key generation', () => {
    it('should create correct query key without chain', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      renderHook(() => useYieldData());

      expect(mockedUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['yieldData']),
          queryFn: expect.any(Function),
          staleTime: 10 * 60 * 1000,
        })
      );
    });

    it('should create correct query key with chain', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      renderHook(() => useYieldData('Ethereum'));

      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['yieldData', 'Ethereum'],
        queryFn: expect.any(Function),
        staleTime: 10 * 60 * 1000,
      });
    });

    it('should create correct query key with lowercase chain', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      renderHook(() => useYieldData('ETHEREUM'));

      expect(mockedUseQuery).toHaveBeenCalledWith({
        queryKey: ['yieldData', 'ETHEREUM'],
        queryFn: expect.any(Function),
        staleTime: 10 * 60 * 1000,
      });
    });
  });

  describe('staleTime configuration', () => {
    it('should use correct staleTime', () => {
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      });

      renderHook(() => useYieldData());

      expect(mockedUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 10 * 60 * 1000,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined chain parameter', async () => {
      mockedGetYieldData.mockResolvedValue([mockYieldData[0]]);
      
      mockedUseQuery.mockReturnValue({
        data: [mockYieldData[0]],
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData(undefined));

      await waitFor(() => {
        expect(result.current.data).toEqual([mockYieldData[0]]);
      });
    });

    it('should handle empty string chain parameter', async () => {
      mockedUseQuery.mockReturnValue({
        data: mockYieldData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData(''));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockYieldData);
      });
    });

    it('should handle chain filter with whitespace', async () => {
      const expectedFilteredData = mockYieldData.filter(
        (item) => item.chain.toLowerCase() === 'ethereum'
      );

      mockedUseQuery.mockReturnValue({
        data: expectedFilteredData,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useYieldData(' Ethereum '));

      await waitFor(() => {
        expect(result.current.data).toEqual(expectedFilteredData);
      });
    });
  });
});