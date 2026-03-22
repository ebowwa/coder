import { useMemo } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTokenPrices } from '../../hooks/useTokenPrices';
import { formatNumber } from '../../utils/format';

interface AllocationItem {
  symbol: string;
  valueUsd: number;
  percentage: number;
  balance: string;
  color: string;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export function PortfolioAllocation() {
  const { portfolio, isLoading } = usePortfolio();

  const tokenAddresses = useMemo(() => 
    portfolio?.tokens.map(t => t.address) || [],
    [portfolio]
  );

  // Mock prices since we need a mapping from address to coingecko ID
  // In production, you'd have a token registry
  const { data: prices } = useTokenPrices(['ethereum', 'tether', 'usd-coin']);

  const allocation = useMemo((): AllocationItem[] => {
    if (!portfolio) return [];

    const items: AllocationItem[] = [];

    // Native ETH
    if (portfolio.nativeValueUsd && portfolio.nativeValueUsd > 0) {
      items.push({
        symbol: 'ETH',
        valueUsd: portfolio.nativeValueUsd,
        percentage: 0,
        balance: `${portfolio.nativeBalance / 10n ** 18n} ETH`,
        color: COLORS[0],
      });
    }

    // Tokens (simplified - in production would fetch actual prices)
    portfolio.tokens.forEach((token, i) => {
      const mockPrice = 1; // Mock price
      const balance = Number(token.balance) / Math.pow(10, token.decimals);
      const valueUsd = balance * mockPrice;
      
      if (valueUsd > 0) {
        items.push({
          symbol: token.symbol,
          valueUsd,
          percentage: 0,
          balance: `${balance.toFixed(4)} ${token.symbol}`,
          color: COLORS[(i + 1) % COLORS.length],
        });
      }
    });

    // Calculate percentages
    const total = items.reduce((sum, item) => sum + item.valueUsd, 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? (item.valueUsd / total) * 100 : 0,
    })).sort((a, b) => b.valueUsd - a.valueUsd);
  }, [portfolio]);

  const totalValue = allocation.reduce((sum, item) => sum + item.valueUsd, 0);

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;
  if (!portfolio || allocation.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-400">
        Connect wallet to view portfolio allocation
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Portfolio Allocation</h2>

      {/* Pie Chart (CSS-based) */}
      <div className="flex justify-center mb-4">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {allocation.map((item, i) => {
              const percentage = item.percentage / 100;
              const dashArray = `${percentage * 314} 314`; // 314 = 2 * PI * 50
              const offset = allocation.slice(0, i).reduce((sum, prev) => sum + (prev.percentage / 100) * 314, 0);
              
              return (
                <circle
                  key={item.symbol}
                  cx="50"
                  cy="50"
                  r="50"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="100"
                  strokeDasharray={dashArray}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-lg font-bold">${formatNumber(totalValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {allocation.map(item => (
          <div key={item.symbol} className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.symbol}</span>
              <span className="text-sm text-gray-400">{item.balance}</span>
            </div>
            <div className="text-right">
              <div className="font-medium">${formatNumber(item.valueUsd)}</div>
              <div className="text-sm text-gray-400">{item.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
