import { useQuery } from '@tanstack/react-query';
import { getYieldData } from '../services/defillama';

export function useYieldData(chain?: string) {
  return useQuery({
    queryKey: ['yieldData', chain],
    queryFn: async () => {
      const data = await getYieldData();
      return chain ? data.filter(y => y.chain.toLowerCase() === chain.toLowerCase()) : data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
