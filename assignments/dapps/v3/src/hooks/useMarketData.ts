import { useQuery } from '@tanstack/react-query';
import { getTopTokens, getMarketData } from '../services/coingecko';

export function useMarketData(limit = 50) {
  const tokens = useQuery({
    queryKey: ['tokens', limit],
    queryFn: () => getTopTokens(limit),
    staleTime: 5 * 60 * 1000,
  });

  const marketData = useQuery({
    queryKey: ['marketData'],
    queryFn: getMarketData,
    staleTime: 5 * 60 * 1000,
  });

  return { tokens: tokens.data || [], marketData: marketData.data, isLoading: tokens.isLoading || marketData.isLoading };
}

export function useTokenPrices(ids: string[]) {
  return useQuery({
    queryKey: ['tokenPrices', ids],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const { getTokenPrices } = await import('../services/coingecko');
      return getTokenPrices(ids);
    },
    staleTime: 60 * 1000,
    enabled: ids.length > 0,
  });
}
