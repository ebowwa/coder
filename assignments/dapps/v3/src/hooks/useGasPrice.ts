import { useQuery } from '@tanstack/react-query';
import { fetchGasPrice } from '../services/gas';
import { STALE_TIME } from '../constants/cache';

export interface GasPriceData {
  slow: { price: number; time: string };
  average: { price: number; time: string };
  fast: { price: number; time: string };
  baseFee?: number;
  lastBlock?: number;
}

export function useGasPrice() {
  return useQuery({
    queryKey: ['gasPrice'],
    queryFn: fetchGasPrice,
    staleTime: STALE_TIME.MINUTE,
    refetchInterval: STALE_TIME.MINUTE,
  });
}
