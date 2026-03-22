/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTokenPrices, useTokenPrice } from '../../src/hooks/useTokenPrices';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockedUseQuery = useQuery as Mock;

describe('useTokenPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useTokenPrices(['ethereum']));
    expect(result.current.isLoading).toBe(true);
  });

  it('should return price data', () => {
    mockedUseQuery.mockReturnValue({ data: { ethereum: { usd: 2000 } }, isLoading: false, error: null });
    const { result } = renderHook(() => useTokenPrices(['ethereum']));
    expect(result.current.data).toEqual({ ethereum: { usd: 2000 } });
  });

  it('should be disabled when ids array is empty', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    renderHook(() => useTokenPrices([]));
    expect(mockedUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('should handle error state', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error('API error') });
    const { result } = renderHook(() => useTokenPrices(['ethereum']));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useTokenPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return single token price', () => {
    mockedUseQuery.mockReturnValue({ data: { bitcoin: { usd: 50000 } }, isLoading: false, error: null });
    const { result } = renderHook(() => useTokenPrice('bitcoin'));
    expect(result.current.data).toEqual({ bitcoin: { usd: 50000 } });
  });

  it('should be disabled when id is empty', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    renderHook(() => useTokenPrice(''));
    expect(mockedUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
