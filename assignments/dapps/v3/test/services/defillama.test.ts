/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getYieldData, getProtocolTVL } from '../../src/services/defillama';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('defillama service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getYieldData', () => {
    it('should fetch and parse yield data successfully', async () => {
      const mockYieldData = [
        {
          chain: 'Ethereum',
          project: 'aave-v2',
          tvlUsd: 1000000000,
          apy: 5.2,
          pool: 'aave-v2-eth',
        },
        {
          chain: 'Polygon',
          project: 'aave-v2',
          tvlUsd: 500000000,
          apy: 4.8,
          pool: 'aave-v2-poly',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockYieldData,
        }),
      });

      const result = await getYieldData();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        chain: 'Ethereum',
        project: 'aave-v2',
        tvl: 1000000000,
        apy: 5.2,
        pool: 'aave-v2-eth',
      });
    });

    it('should limit results to 100 items', async () => {
      const mockYieldData = Array.from({ length: 150 }, (_, i) => ({
        chain: 'Ethereum',
        project: `project-${i}`,
        tvlUsd: 1000000 * i,
        apy: 5.0,
        pool: `pool-${i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockYieldData,
        }),
      });

      const result = await getYieldData();

      expect(result).toHaveLength(100);
      expect(result[0].project).toBe('project-0');
      expect(result[99].project).toBe('project-99');
    });

    it('should handle empty yield data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      });

      const result = await getYieldData();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await getYieldData();

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('yields.llama.fi/pools');
    });

    it('should map API response fields correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              chain: 'Arbitrum',
              project: 'uniswap-v3',
              tvlUsd: 250000000,
              apy: 12.5,
              pool: 'uni-v3-arb',
            },
          ],
        }),
      });

      const result = await getYieldData();

      expect(result[0]).toEqual({
        chain: 'Arbitrum',
        project: 'uniswap-v3',
        tvl: 250000000,
        apy: 12.5,
        pool: 'uni-v3-arb',
      });
    });
  });

  describe('getProtocolTVL', () => {
    it('should fetch and return protocol TVL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentChainTvls: [
            { tvl: 5000000000 },
          ],
        }),
      });

      const result = await getProtocolTVL('aave');

      expect(result).toBe(5000000000);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.llama.fi/protocol/aave');
    });

    it('should return 0 when no TVL data available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentChainTvls: [],
        }),
      });

      const result = await getProtocolTVL('unknown-protocol');

      expect(result).toBe(0);
    });

    it('should return 0 when currentChainTvls is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await getProtocolTVL('unknown-protocol');

      expect(result).toBe(0);
    });

    it('should handle different protocols', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          currentChainTvls: [{ tvl: 1000000000 }],
        }),
      });

      await getProtocolTVL('uniswap');
      const call1 = mockFetch.mock.calls[0][0];
      expect(call1).toContain('protocol/uniswap');

      await getProtocolTVL('curve');
      const call2 = mockFetch.mock.calls[1][0];
      expect(call2).toContain('protocol/curve');
    });

    it('should return first TVL when multiple chains available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentChainTvls: [
            { tvl: 3000000000 },
            { tvl: 2000000000 },
            { tvl: 1000000000 },
          ],
        }),
      });

      const result = await getProtocolTVL('multichain-protocol');

      expect(result).toBe(3000000000);
    });

    it('should handle missing tvl property', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentChainTvls: [
            { notTvl: 1000 },
          ],
        }),
      });

      const result = await getProtocolTVL('protocol');

      expect(result).toBe(0);
    });
  });
});
