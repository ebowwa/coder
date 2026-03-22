import { useQuery } from '@tanstack/react-query';
import { getYieldData } from '../services/defillama';
import { STALE_TIME } from '../constants/cache';

export function useYieldData(chain?: string) {
  return useQuery({
    queryKey: ['yieldData', chain],
    queryFn: async () => {
      const data = await getYieldData();
      return chain ? data.filter(y => y.chain.toLowerCase() === chain.toLowerCase()) : data;
    },
    staleTime: STALE_TIME.TEN_MINUTES,
  });
}
