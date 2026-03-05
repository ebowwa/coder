/**
 * useWeb3 Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeb3 } from '../../src/hooks/useWeb3';
import { Web3Provider } from '../../src/providers/Web3Provider';
import { BrowserProvider, Contract } from 'ethers';

// Mock ethers
vi.mock('ethers', () => ({
  BrowserProvider: vi.fn(),
  Contract: vi.fn(),
  formatEther: (x: bigint) => x.toString(),
  parseEther: (x: string) => BigInt(x),
}));

const mockProvider = {
  getNetwork: vi.fn().mockResolvedValue({ chainId: 31337n }),
  listAccounts: vi.fn().mockResolvedValue([]),
  getSigner: vi.fn().mockReturnValue({
    getAddress: vi.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
  }),
};

const mockSigner = {
  getAddress: vi.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
};

describe('useWeb3 Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.ethereum
    Object.defineProperty(window, 'ethereum', {
      value: {
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      writable: true,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Web3Provider>{children}</Web3Provider>
  );

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBe(null);
      expect(result.current.provider).toBe(null);
      expect(result.current.chainId).toBe(null);
    });
  });

  describe('Connect', () => {
    it('should connect to wallet', async () => {
      (window.ethereum as any).request = vi.fn().mockResolvedValueOnce(['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']);
      
      const { result } = renderHook(() => useWeb3(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection error', async () => {
      (window.ethereum as any).request = vi.fn().mockRejectedValueOnce(new Error('User rejected'));
      
      const { result } = renderHook(() => useWeb3(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('Disconnect', () => {
    it('should disconnect wallet', async () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      
      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBe(null);
    });
  });

  describe('Switch Chain', () => {
    it('should switch chain', async () => {
      (window.ethereum as any).request = vi.fn().mockResolvedValueOnce(null);
      
      const { result } = renderHook(() => useWeb3(), { wrapper });
      
      await act(async () => {
        await result.current.switchChain(11155111);
      });

      expect(window.ethereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    });
  });
});
