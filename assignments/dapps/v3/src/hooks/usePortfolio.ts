import { useQuery } from '@tanstack/react-query';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import type { Portfolio, PortfolioToken } from '../types/portfolio';

const TOKENS = [
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const, symbol: 'USDC', decimals: 6 },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const, symbol: 'USDT', decimals: 6 },
  { address: '0x6B175474E89094C44Da98b954EescdCBF5B46bF6' as const, symbol: 'DAI', decimals: 18 },
];

export function usePortfolio() {
  const { address, isConnected } = useAccount();
  
  const nativeBalance = useBalance({ address, enabled: isConnected });
  
  const tokenBalances = useReadContracts({
    contracts: TOKENS.map(t => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: isConnected && !!address },
  });

  const portfolio: Portfolio | undefined = address ? {
    totalValueUsd: 0,
    tokens: TOKENS.map((t, i) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.symbol,
      balance: (tokenBalances.data?.[i]?.result as bigint) || 0n,
      decimals: t.decimals,
    })).filter(t => t.balance > 0n),
    nativeBalance: nativeBalance.data?.value || 0n,
    nativeValueUsd: Number(nativeBalance.data?.value || 0n) / 1e18 * 2000,
    change24h: 0,
    changePercent24h: 0,
  } : undefined;

  return { portfolio, isLoading: nativeBalance.isLoading || tokenBalances.isLoading };
}
