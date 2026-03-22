import { useQuery } from '@tanstack/react-query';
import { getTokenPrices } from '../services/coingecko';
import { STALE_TIME } from '../constants/cache';

export function useTokenPrices(ids: string[], enabled = true) {
  return useQuery({
    queryKey: ['tokenPrices', ids],
    queryFn: () => getTokenPrices(ids),
    staleTime: STALE_TIME.MINUTE,
    enabled: enabled && ids.length > 0,
  });
}

export function useTokenPrice(id?: string | null) {
  return useTokenPrices(id ? [id] : [], !!id);
}
