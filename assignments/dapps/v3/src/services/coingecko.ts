import { createApiClient } from '../utils/api';
import type { Token, MarketData, ChartData } from '../types/market';

const api = createApiClient('https://api.coingecko.com/api/v3');

export async function getTopTokens(limit = 50): Promise<Token[]> {
  return api.get<Token[]>(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&sparkline=true`);
}

export async function getTokenPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (ids.length === 0) return {};
  return api.get(`/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
}

export async function getMarketData(): Promise<MarketData> {
  const data = await api.get<{ data: any }>('/global');
  return {
    totalMarketCap: data.data.total_market_cap.usd,
    totalVolume: data.data.total_volume.usd,
    btcDominance: data.data.market_cap_percentage.btc,
    marketCapChangePercentage24h: data.data.market_cap_change_percentage_24h_usd,
  };
}

export async function getChartData(id: string, days: number): Promise<ChartData[]> {
  const data: number[][] = await api.get(`/coins/${id}/ohlc?vs_currency=usd&days=${days}`);
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp, open, high, low, close, volume: 0,
  }));
}
