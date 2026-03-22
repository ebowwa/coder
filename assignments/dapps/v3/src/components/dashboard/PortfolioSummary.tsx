import { usePortfolio } from '../../hooks/usePortfolio';
import { formatNumber } from '../../utils/format';

export function PortfolioSummary() {
  const { portfolio, isLoading } = usePortfolio();

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-800 rounded-lg" />;
  if (!portfolio) return <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-400">Connect wallet to view portfolio</div>;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-2">Portfolio</h2>
      <div className="text-3xl font-bold">${formatNumber(portfolio.nativeValueUsd || 0)}</div>
      <div className={portfolio.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}>
        {portfolio.changePercent24h >= 0 ? '+' : ''}{portfolio.changePercent24h.toFixed(2)}% (24h)
      </div>
      <div className="mt-4 text-sm text-gray-400">{portfolio.tokens.length} tokens</div>
    </div>
  );
}
