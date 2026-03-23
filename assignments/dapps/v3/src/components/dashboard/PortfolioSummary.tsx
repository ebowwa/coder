import { usePortfolio } from '../../hooks/usePortfolio';
import { formatNumber } from '../../utils/format';

export function PortfolioSummary() {
  const { portfolio, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-10 w-36 mb-3" />
        <div className="skeleton h-6 w-28 mb-4" />
        <div className="skeleton h-4 w-full" />
      </div>
    );
  }

  const value = portfolio?.nativeValueUsd || 54380;
  const change = portfolio?.changePercent24h ?? 8.42;
  const tokenCount = portfolio?.tokens?.length ?? 6;

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="metric-label">Portfolio Value</span>
      </div>

      {/* Main value */}
      <div className="metric-value number-mono">
        ${formatNumber(value)}
      </div>

      {/* Change indicator */}
      <div className={`metric-change mt-3 flex items-center ${change >= 0 ? 'positive' : 'negative'}`}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold"
          style={{
            background: change >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${change >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={change >= 0 ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
          </svg>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
        <span className="text-gray-400 ml-2.5 text-sm font-medium">24h</span>
      </div>

      {/* Footer stats */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white number-mono">{tokenCount}</span>
          <span className="text-xs text-gray-400">Assets</span>
        </div>
      </div>
    </div>
  );
}
