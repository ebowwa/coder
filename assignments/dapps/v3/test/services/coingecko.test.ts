/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTopTokens, getTokenPrices, getMarketData, getChartData } from '../../src/services/coingecko';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('coingecko service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTopTokens', () => {
    it('should fetch top tokens with default limit', async () => {
      const mockTokens = [
        {
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 45000,
          market_cap: 850000000000,
        },
        {
          id: 'ethereum',
          symbol: 'eth',
          name: 'Ethereum',
          current_price: 3200,
          market_cap: 385000000000,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const result = await getTopTokens();

      expect(result).toEqual(mockTokens);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('per_page=50');
    });

    it('should fetch top tokens with custom limit', async () => {
      const mockTokens = Array.from({ length: 100 }, (_, i) => ({
        id: `token-${i}`,
        symbol: `tkn${i}`,
        name: `Token ${i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });

      const result = await getTopTokens(100);

      expect(result).toHaveLength(100);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('per_page=100');
    });

    it('should call correct API endpoint with parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getTopTokens(25);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.coingecko.com/api/v3/coins/markets');
      expect(callUrl).toContain('vs_currency=usd');
      expect(callUrl).toContain('order=market_cap_desc');
      expect(callUrl).toContain('per_page=25');
      expect(callUrl).toContain('sparkline=true');
    });

    it('should return empty array when API returns empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await getTopTokens();

      expect(result).toEqual([]);
    });
  });

  describe('getTokenPrices', () => {
    it('should fetch token prices for multiple tokens', async () => {
      const mockPrices = {
        bitcoin: { usd: 45000, usd_24h_change: 2.5 },
        ethereum: { usd: 3200, usd_24h_change: -1.2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrices,
      });

      const result = await getTokenPrices(['bitcoin', 'ethereum']);

      expect(result).toEqual(mockPrices);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('ids=bitcoin,ethereum');
    });

    it('should fetch token prices for single token', async () => {
      const mockPrices = {
        bitcoin: { usd: 45000, usd_24h_change: 2.5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrices,
      });

      const result = await getTokenPrices(['bitcoin']);

      expect(result).toEqual(mockPrices);
    });

    it('should return empty object for empty ids array', async () => {
      const result = await getTokenPrices([]);

      expect(result).toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include 24h change in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await getTokenPrices(['bitcoin']);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('include_24hr_change=true');
    });

    it('should use USD currency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await getTokenPrices(['bitcoin']);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('vs_currencies=usd');
    });
  });

  describe('getMarketData', () => {
    it('should fetch and parse market data', async () => {
      const mockGlobalData = {
        data: {
          total_market_cap: { usd: 1235000000000 },
          total_volume: { usd: 43000000000 },
          market_cap_percentage: { btc: 43.2, eth: 18.5 },
          market_cap_change_percentage_24h_usd: 1.5,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGlobalData,
      });

      const result = await getMarketData();

      expect(result).toEqual({
        totalMarketCap: 1235000000000,
        totalVolume: 43000000000,
        btcDominance: 43.2,
        marketCapChangePercentage24h: 1.5,
      });
    });

    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total_market_cap: { usd: 0 },
            total_volume: { usd: 0 },
            market_cap_percentage: { btc: 0 },
            market_cap_change_percentage_24h_usd: 0,
          },
        }),
      });

      await getMarketData();

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.coingecko.com/api/v3/global');
    });

    it('should extract BTC dominance correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total_market_cap: { usd: 1000000000000 },
            total_volume: { usd: 50000000000 },
            market_cap_percentage: { btc: 50.5, eth: 20.3 },
            market_cap_change_percentage_24h_usd: -2.3,
          },
        }),
      });

      const result = await getMarketData();

      expect(result.btcDominance).toBe(50.5);
    });
  });

  describe('getChartData', () => {
    it('should fetch and parse OHLC chart data', async () => {
      const mockOhlcData = [
        [1609459200000, 28900, 29100, 28800, 29000], // timestamp, open, high, low, close
        [1609545600000, 29000, 29500, 28900, 29400],
        [1609632000000, 29400, 29600, 29300, 29500],
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOhlcData,
      });

      const result = await getChartData('bitcoin', 7);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        timestamp: 1609459200000,
        open: 28900,
        high: 29100,
        low: 28800,
        close: 29000,
        volume: 0,
      });
    });

    it('should call correct API endpoint with parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getChartData('ethereum', 30);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.coingecko.com/api/v3/coins/ethereum/ohlc');
      expect(callUrl).toContain('vs_currency=usd');
      expect(callUrl).toContain('days=30');
    });

    it('should handle empty chart data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await getChartData('bitcoin', 7);

      expect(result).toEqual([]);
    });

    it('should set volume to 0 for all data points', async () => {
      const mockOhlcData = [
        [1609459200000, 28900, 29100, 28800, 29000],
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOhlcData,
      });

      const result = await getChartData('bitcoin', 1);

      expect(result[0].volume).toBe(0);
    });

    it('should handle different time periods', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await getChartData('bitcoin', 1);
      const call1 = mockFetch.mock.calls[0][0];
      expect(call1).toContain('days=1');

      await getChartData('bitcoin', 90);
      const call2 = mockFetch.mock.calls[1][0];
      expect(call2).toContain('days=90');

      await getChartData('bitcoin', 365);
      const call3 = mockFetch.mock.calls[2][0];
      expect(call3).toContain('days=365');
    });

    it('should map all OHLC fields correctly', async () => {
      const mockOhlcData = [
        [1234567890000, 100, 110, 90, 105],
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOhlcData,
      });

      const result = await getChartData('test-token', 7);

      expect(result[0]).toEqual({
        timestamp: 1234567890000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 0,
      });
    });
  });
});
