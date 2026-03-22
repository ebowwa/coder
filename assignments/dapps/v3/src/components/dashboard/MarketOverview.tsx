import { useMarketData } from '../../hooks/useMarketData';
import { formatNumber } from '../../utils/format';

export function MarketOverview() {
  const { tokens, marketData, isLoading } = useMarketData(50);

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Market Overview</h2>
        <div className="text-sm text-gray-400">
          Market Cap: ${formatNumber(marketData?.totalMarketCap || 0)} |
          24h: <span className={marketData?.marketCapChangePercentage24h >= 0 ? 'text-green-500' : 'text-red-500'}>
            {marketData?.marketCapChangePercentage24h?.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="grid gap-2 max-h-96 overflow-auto">
        {tokens.map(token => (
          <div key={token.id} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded">
            <div className="flex items-center gap-2">
              <img src={token.image} alt={token.symbol} className="w-6 h-6 rounded-full" />
              <span className="font-medium">{token.symbol.toUpperCase()}</span>
              <span className="text-gray-400 text-sm">{token.name}</span>
            </div>
            <div className="text-right">
              <div className="font-medium">${token.current_price.toLocaleString()}</div>
              <div className={token.price_change_percentage_24h >= 0 ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                {token.price_change_percentage_24h?.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
