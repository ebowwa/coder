import { useQuery } from '@tanstack/react-query';
import { getTokenPrices } from '../services/coingecko';

export function useTokenPrices(ids: string[], enabled = true) {
  return useQuery({
    queryKey: ['tokenPrices', ids],
    queryFn: () => getTokenPrices(ids),
    staleTime: 60 * 1000,
    enabled: enabled && ids.length > 0,
  });
}

export function useTokenPrice(id: string) {
  return useTokenPrices([id], !!id);
}
