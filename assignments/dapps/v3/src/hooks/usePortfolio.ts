import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import type { Portfolio } from '../types/portfolio';
import { formatTokenBalance } from '../utils/format';
import { POPULAR_TOKENS } from '../constants/tokens';

export function usePortfolio() {
  const { address, isConnected } = useAccount();

  const nativeBalance = useBalance({ address, query: { enabled: isConnected } });

  const tokenBalances = useReadContracts({
    contracts: POPULAR_TOKENS.map(t => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: isConnected && !!address },
  });

  const portfolio: Portfolio | undefined = address ? {
    totalValueUsd: 0,
    tokens: POPULAR_TOKENS.map((t, i) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.symbol,
      balance: (tokenBalances.data?.[i]?.result as bigint) || 0n,
      decimals: t.decimals,
    })).filter(t => t.balance > 0n),
    nativeBalance: nativeBalance.data?.value || 0n,
    nativeValueUsd: formatTokenBalance(nativeBalance.data?.value || 0n, 18) * 2000,
    change24h: 0,
    changePercent24h: 0,
  } : undefined;

  return { portfolio, isLoading: nativeBalance.isLoading || tokenBalances.isLoading };
}
