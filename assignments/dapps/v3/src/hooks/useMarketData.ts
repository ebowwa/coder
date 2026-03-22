import { useQuery } from '@tanstack/react-query';
import { getTopTokens, getMarketData } from '../services/coingecko';
import { STALE_TIME } from '../constants/cache';

export function useMarketData(limit = 50) {
  const tokens = useQuery({
    queryKey: ['tokens', limit],
    queryFn: () => getTopTokens(limit),
    staleTime: STALE_TIME.FIVE_MINUTES,
  });

  const marketData = useQuery({
    queryKey: ['marketData'],
    queryFn: getMarketData,
    staleTime: STALE_TIME.FIVE_MINUTES,
  });

  return { tokens: tokens.data || [], marketData: marketData.data, isLoading: tokens.isLoading || marketData.isLoading };
}
