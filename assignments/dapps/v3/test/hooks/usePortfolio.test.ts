/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePortfolio } from '../../src/hooks/usePortfolio';
import { useAccount, useBalance, useReadContracts } from 'wagmi';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useBalance: vi.fn(),
  useReadContracts: vi.fn(),
}));

const mockedUseAccount = useAccount as Mock;
const mockedUseBalance = useBalance as Mock;
const mockedUseReadContracts = useReadContracts as Mock;

describe('usePortfolio', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when disconnected', () => {
    it('should return undefined portfolio when not connected', () => {
      mockedUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('when connected', () => {
    it('should return portfolio with native balance', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: {
          value: 1000000000000000000n, // 1 ETH
          decimals: 18,
          symbol: 'ETH',
        },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio).toBeDefined();
      expect(result.current.portfolio?.nativeBalance).toBe(1000000000000000000n);
      expect(result.current.portfolio?.nativeValueUsd).toBe(2000); // 1 ETH * $2000
      expect(result.current.isLoading).toBe(false);
    });

    it('should return portfolio with token balances', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: {
          value: 500000000000000000n, // 0.5 ETH
          decimals: 18,
        },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [
          { result: 1000000n }, // USDC balance
          { result: 0n },       // USDT balance (will be filtered out)
          { result: 5000000000000000000n }, // DAI balance
        ],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio).toBeDefined();
      expect(result.current.portfolio?.tokens).toHaveLength(2); // USDC and DAI (USDT filtered)
      
      const symbols = result.current.portfolio?.tokens.map(t => t.symbol);
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('DAI');
      expect(symbols).not.toContain('USDT');
    });

    it('should filter out tokens with zero balance', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: { value: 0n, decimals: 18 },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [
          { result: 0n },
          { result: 0n },
          { result: 0n },
        ],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio?.tokens).toHaveLength(0);
    });

    it('should return loading state when native balance is loading', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return loading state when token balances are loading', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.isLoading).toBe(true);
    });

    it('should calculate nativeValueUsd correctly', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: {
          value: 2500000000000000000n, // 2.5 ETH
          decimals: 18,
        },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      // 2.5 ETH * $2000 = $5000
      expect(result.current.portfolio?.nativeValueUsd).toBe(5000);
    });

    it('should handle undefined token balance data', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: { value: 0n, decimals: 18 },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio?.tokens).toHaveLength(0);
    });

    it('should handle missing balance result', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: { value: 0n, decimals: 18 },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [null, undefined, {}],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio?.tokens).toHaveLength(0);
    });

    it('should initialize portfolio with correct default values', () => {
      mockedUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      } as any);

      mockedUseBalance.mockReturnValue({
        data: { value: 0n, decimals: 18 },
        isLoading: false,
      } as any);

      mockedUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.portfolio?.totalValueUsd).toBe(0);
      expect(result.current.portfolio?.change24h).toBe(0);
      expect(result.current.portfolio?.changePercent24h).toBe(0);
    });
  });
});
