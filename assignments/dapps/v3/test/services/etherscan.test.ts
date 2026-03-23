/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkVerification, verifyContract } from '../../src/services/etherscan';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('etherscan service', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.ETHERSCAN_API_KEY;
    delete process.env.ETHERSCAN_API_KEY_1;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkVerification', () => {
    it('should return verified: false for unsupported chain', async () => {
      const result = await checkVerification(mockAddress, 999);
      expect(result).toEqual({ verified: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return verified: true when contract is verified', async () => {
      const mockSourceCode = 'pragma solidity ^0.8.0;';
      const mockAbi = [{ type: 'function', name: 'transfer' }];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          result: [{
            SourceCode: mockSourceCode,
            ABI: JSON.stringify(mockAbi),
          }],
        }),
      });

      const result = await checkVerification(mockAddress, 1);
      
      expect(result).toEqual({
        verified: true,
        sourceCode: mockSourceCode,
        abi: mockAbi,
      });
    });

    it('should return verified: false when contract is not verified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          result: [],
        }),
      });

      const result = await checkVerification(mockAddress, 1);
      
      expect(result).toEqual({ verified: false });
    });

    it('should return verified: false when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkVerification(mockAddress, 1);
      
      expect(result).toEqual({ verified: false });
    });

    it('should use chain-specific API key when available', async () => {
      process.env.ETHERSCAN_API_KEY_1 = 'chain-specific-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          result: [],
        }),
      });

      await checkVerification(mockAddress, 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('apikey=chain-specific-key')
      );
    });

    it('should fallback to generic API key', async () => {
      process.env.ETHERSCAN_API_KEY = 'generic-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          result: [],
        }),
      });

      await checkVerification(mockAddress, 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('apikey=generic-key')
      );
    });

    it('should handle different chains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '0',
          result: [],
        }),
      });

      // Test Ethereum mainnet
      await checkVerification(mockAddress, 1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.etherscan.io')
      );

      // Test Arbitrum
      await checkVerification(mockAddress, 42161);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.arbiscan.io')
      );

      // Test Optimism
      await checkVerification(mockAddress, 10);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api-optimistic.etherscan.io')
      );

      // Test Polygon
      await checkVerification(mockAddress, 137);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.polygonscan.com')
      );
    });
  });

  describe('verifyContract', () => {
    const mockSourceCode = 'pragma solidity ^0.8.0; contract Test {}';

    it('should return false for unsupported chain', async () => {
      const result = await verifyContract(mockAddress, mockSourceCode, 999);
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return true when verification succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
        }),
      });

      const result = await verifyContract(mockAddress, mockSourceCode, 1);
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('action=verifysourcecode'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return false when verification fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
        }),
      });

      const result = await verifyContract(mockAddress, mockSourceCode, 1);
      
      expect(result).toBe(false);
    });

    it('should return false when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await verifyContract(mockAddress, mockSourceCode, 1);
      
      expect(result).toBe(false);
    });

    it('should encode source code in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '1' }),
      });

      await verifyContract(mockAddress, mockSourceCode, 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(mockSourceCode)),
        expect.any(Object)
      );
    });

    it('should use API key in verification request', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '1' }),
      });

      await verifyContract(mockAddress, mockSourceCode, 1);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('apikey=test-key'),
        expect.any(Object)
      );
    });
  });
});
