import type { YieldData } from '../types/market';

const BASE_URL = 'https://yields.llama.fi';

export async function getYieldData(): Promise<YieldData[]> {
  const res = await fetch(`${BASE_URL}/pools`);
  if (!res.ok) throw new Error('Failed to fetch yield data');
  const data = await res.json();
  return data.data.slice(0, 100).map((p: any) => ({
    chain: p.chain,
    project: p.project,
    tvl: p.tvlUsd,
    apy: p.apy,
    pool: p.pool,
  }));
}

export async function getProtocolTVL(protocol: string): Promise<number> {
  const res = await fetch(`https://api.llama.fi/protocol/${protocol}`);
  if (!res.ok) throw new Error('Failed to fetch protocol TVL');
  const data = await res.json();
  return data.currentChainTvls?.[0]?.tvl || 0;
}
