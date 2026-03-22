export interface Token {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: { price: number[] };
}

export interface TokenPrice {
  id: string;
  price: number;
  change24h: number;
  lastUpdated: number;
}

export interface MarketData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChangePercentage24h: number;
}

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface YieldData {
  chain: string;
  project: string;
  tvl: number;
  apy: number;
  pool: string;
}

export const tokenSchema = {
  id: 'string',
  symbol: 'string',
  name: 'string',
  current_price: 'number',
  price_change_percentage_24h: 'number',
};
