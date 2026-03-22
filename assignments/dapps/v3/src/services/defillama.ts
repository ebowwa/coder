import { createApiClient } from '../utils/api';
import type { YieldData } from '../types/market';

const yieldsApi = createApiClient('https://yields.llama.fi');
const tvlApi = createApiClient('https://api.llama.fi');

export async function getYieldData(): Promise<YieldData[]> {
  const data = await yieldsApi.get<{ data: any[] }>('/pools');
  return data.data.slice(0, 100).map((p) => ({
    chain: p.chain,
    project: p.project,
    tvl: p.tvlUsd,
    apy: p.apy,
    pool: p.pool,
  }));
}

export async function getProtocolTVL(protocol: string): Promise<number> {
  const data = await tvlApi.get<{ currentChainTvls?: { tvl: number }[] }>(`/protocol/${protocol}`);
  return data.currentChainTvls?.[0]?.tvl || 0;
}
