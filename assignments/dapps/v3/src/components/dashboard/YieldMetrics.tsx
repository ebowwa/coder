import { useYieldData } from '../../hooks/useYieldData';
import { formatNumber } from '../../utils/format';

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: 'from-blue-500 to-indigo-500',
  Arbitrum: 'from-blue-400 to-cyan-400',
  Optimism: 'from-red-500 to-orange-500',
  Polygon: 'from-purple-500 to-violet-500',
  Base: 'from-blue-600 to-blue-400',
  Avalanche: 'from-red-600 to-orange-500',
};

export function YieldMetrics({ chain }: { chain?: string }) {
  const { data: yields, isLoading } = useYieldData(chain);

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 to-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="metric-label">Top Yields {chain && `on ${chain}`}</span>
        </div>
        <span className="text-xs text-gray-500">DefiLlama</span>
      </div>

      {/* Yield List */}
      <div className="space-y-2 max-h-80 overflow-auto relative z-10">
        {yields?.slice(0, 10).map((y, i) => {
          const chainGradient = CHAIN_COLORS[y.chain] || 'from-gray-500 to-gray-400';
          return (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${chainGradient} flex items-center justify-center text-xs font-bold text-white`}>
                  #{i + 1}
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {y.project}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-slate-700/50 rounded">{y.chain}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold number-mono">
                  {y.apy.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  ${formatNumber(y.tvl)}
                </div>
              </div>
            </div>
          );
        })}

        {(!yields || yields.length === 0) && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-gray-400 font-medium">No yield data available</div>
            <div className="text-gray-500 text-sm mt-1">Check back later for updates</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <span className="text-xs text-gray-500">Top 10 by APY</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live data</span>
        </div>
      </div>
    </div>
  );
}
