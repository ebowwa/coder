import type { Token, MarketData, ChartData } from '../types/market';

const BASE_URL = 'https://api.coingecko.com/api/v3';

export async function getTopTokens(limit = 50): Promise<Token[]> {
  const res = await fetch(`${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&sparkline=true`);
  if (!res.ok) throw new Error('Failed to fetch tokens');
  return res.json();
}

export async function getTokenPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const res = await fetch(`${BASE_URL}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
  if (!res.ok) throw new Error('Failed to fetch prices');
  return res.json();
}

export async function getMarketData(): Promise<MarketData> {
  const res = await fetch(`${BASE_URL}/global`);
  if (!res.ok) throw new Error('Failed to fetch market data');
  const data = await res.json();
  return {
    totalMarketCap: data.data.total_market_cap.usd,
    totalVolume: data.data.total_volume.usd,
    btcDominance: data.data.market_cap_percentage.btc,
    marketCapChangePercentage24h: data.data.market_cap_change_percentage_24h_usd,
  };
}

export async function getChartData(id: string, days: number): Promise<ChartData[]> {
  const res = await fetch(`${BASE_URL}/coins/${id}/ohlc?vs_currency=usd&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch chart data');
  const data: number[][] = await res.json();
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp, open, high, low, close, volume: 0,
  }));
}
