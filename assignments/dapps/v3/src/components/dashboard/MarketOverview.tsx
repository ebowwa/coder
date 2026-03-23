import { useMarketData } from '../../hooks/useMarketData';
import { formatNumber } from '../../utils/format';

export function MarketOverview() {
  const { tokens, marketData, isLoading } = useMarketData(50);

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

  const marketCapChange = marketData?.marketCapChangePercentage24h ?? 0;
  const isPositive = marketCapChange >= 0;

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="metric-label">Market Overview</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">
            MCap: <span className="text-white font-semibold">${formatNumber(marketData?.totalMarketCap || 0)}</span>
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive
              ? 'bg-green-500/15 border border-green-500/30 text-green-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isPositive ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
            </svg>
            {isPositive ? '+' : ''}{marketCapChange.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Token Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Token</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">24h</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Market Cap</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {tokens.slice(0, 15).map((token, index) => {
                const changePositive = token.price_change_percentage_24h >= 0;
                return (
                  <tr
                    key={token.id}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="text-gray-500 text-xs font-medium">{index + 1}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {token.image ? (
                            <img
                              src={token.image}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full ring-2 ring-gray-700/50 group-hover:ring-blue-500/30 transition-all"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                              <span className="text-[6px] font-bold text-white">★</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {token.symbol.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-white font-medium">
                        ${token.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: token.current_price < 1 ? 6 : 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        changePositive
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={changePositive ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                        </svg>
                        {changePositive ? '+' : ''}{token.price_change_percentage_24h?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      <span className="text-gray-300 font-mono">${formatNumber(token.market_cap)}</span>
                    </td>
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      <span className="text-gray-400 font-mono">${formatNumber(token.total_volume)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <span className="text-xs text-gray-500">Top 15 by market cap</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live prices</span>
        </div>
      </div>
    </div>
  );
}
