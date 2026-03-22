export interface PortfolioToken {
  address: `0x${string}`;
  symbol: string;
  name: string;
  balance: bigint;
  decimals: number;
  valueUsd?: number;
  priceChange24h?: number;
}

export interface Portfolio {
  totalValueUsd: number;
  tokens: PortfolioToken[];
  nativeBalance: bigint;
  nativeValueUsd?: number;
  change24h: number;
  changePercent24h: number;
}

export interface Transaction {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
}

export interface VerificationStatus {
  address: `0x${string}`;
  isVerified: boolean;
  verifier?: string;
  timestamp?: number;
  codeHash?: string;
}
