import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { STALE_TIME } from '../constants/cache';

export type StaleTimeKey = keyof typeof STALE_TIME;

export interface QueryConfig<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  staleTimeKey?: StaleTimeKey;
  enabled?: boolean;
}

export function createQueryHook<T>(config: QueryConfig<T>) {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    staleTime: STALE_TIME[config.staleTimeKey ?? 'FIVE_MINUTES'],
    enabled: config.enabled ?? true,
  } as UseQueryOptions<T>);
}

export function buildQueryConfig<T>(
  key: string,
  params: unknown[],
  fetcher: () => Promise<T>,
  staleTimeKey: StaleTimeKey = 'FIVE_MINUTES'
): QueryConfig<T> {
  return {
    queryKey: [key, ...params],
    queryFn: fetcher,
    staleTimeKey,
  };
}
