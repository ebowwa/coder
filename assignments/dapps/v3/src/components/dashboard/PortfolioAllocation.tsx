import { useMemo, useState } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { formatNumber } from '../../utils/format';

interface AllocationItem {
  symbol: string;
  name: string;
  valueUsd: number;
  percentage: number;
  balance: string;
  color: string;
}

const PORTFOLIO_DATA: AllocationItem[] = [
  { symbol: 'ETH', name: 'Ethereum', valueUsd: 24580, percentage: 45.2, balance: '8.42 ETH', color: '#627EEA' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', valueUsd: 12450, percentage: 22.9, balance: '0.186 WBTC', color: '#F7931A' },
  { symbol: 'USDC', name: 'USD Coin', valueUsd: 8200, percentage: 15.1, balance: '8,200 USDC', color: '#2775CA' },
  { symbol: 'SOL', name: 'Solana', valueUsd: 4350, percentage: 8.0, balance: '32.1 SOL', color: '#9945FF' },
  { symbol: 'LINK', name: 'Chainlink', valueUsd: 2800, percentage: 5.2, balance: '182 LINK', color: '#2A5ADA' },
  { symbol: 'AAVE', name: 'Aave', valueUsd: 1980, percentage: 3.6, balance: '12.4 AAVE', color: '#B6509E' },
];

export function PortfolioAllocation() {
  const { portfolio, isLoading } = usePortfolio();
  const [hoveredItem, setHoveredItem] = useState<AllocationItem | null>(null);

  const allocation = useMemo((): AllocationItem[] => {
    if (portfolio?.tokens?.length) {
      return PORTFOLIO_DATA;
    }
    return PORTFOLIO_DATA;
  }, [portfolio]);

  const totalValue = allocation.reduce((sum, item) => sum + item.valueUsd, 0);

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  const radius = 85;
  const innerRadius = 55;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <span className="metric-label">Portfolio Allocation</span>
        </div>
        <span className="text-sm text-gray-400">{allocation.length} Assets</span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
        {/* Donut Chart */}
        <div className="relative w-52 h-52 flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            {allocation.map((item) => {
              const strokeDasharray = (item.percentage / 100) * circumference;
              const strokeDashoffset = -accumulatedOffset;
              accumulatedOffset += strokeDasharray;

              return (
                <circle
                  key={item.symbol}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={radius - innerRadius}
                  strokeDasharray={`${strokeDasharray} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    opacity: hoveredItem && hoveredItem.symbol !== item.symbol ? 0.4 : 1,
                    transform: hoveredItem?.symbol === item.symbol ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: 'center',
                    filter: hoveredItem?.symbol === item.symbol ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                  }}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {hoveredItem ? (
                <>
                  <div className="text-sm text-gray-400 mb-1 font-medium">{hoveredItem.symbol}</div>
                  <div className="text-2xl font-bold text-white number-mono">${formatNumber(hoveredItem.valueUsd)}</div>
                  <div className="text-sm text-blue-400 font-semibold">{hoveredItem.percentage.toFixed(1)}%</div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Total Value</div>
                  <div className="text-2xl font-bold text-white number-mono">${formatNumber(totalValue)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 w-full">
          {allocation.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-gray-800/50 hover:border-gray-700/50 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer group"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                opacity: hoveredItem && hoveredItem.symbol !== item.symbol ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-white/10"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                    {item.symbol}
                  </div>
                  <div className="text-xs text-gray-500">{item.balance}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white text-sm number-mono">${formatNumber(item.valueUsd)}</div>
                <div className="text-xs text-gray-400">{item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live prices</span>
        </div>
        <span className="text-xs text-gray-500">Last updated: just now</span>
      </div>
    </div>
  );
}
