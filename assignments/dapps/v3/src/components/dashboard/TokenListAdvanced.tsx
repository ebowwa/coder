import { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { useTokenFilters, type TokenFilters } from '../../hooks/useTokenFilters';
import { formatNumber } from '../../utils/format';

export function TokenListAdvanced() {
  const { tokens, isLoading } = useMarketData(250);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TokenFilters>({
    search: '',
    sortBy: 'market_cap',
    sortOrder: 'desc',
  });

  const filteredTokens = useTokenFilters(tokens, filters);

  const updateFilter = <K extends keyof TokenFilters>(key: K, value: TokenFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'market_cap',
      sortOrder: 'desc',
    });
  };

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Token Explorer</h2>
        <div className="flex gap-2">
          <span className="text-sm text-gray-400 self-center">
            {filteredTokens.length} of {tokens.length}
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or symbol..."
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          className="w-full p-2 bg-gray-800 rounded text-white"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-800 rounded space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Price ($)</label>
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={e => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2 bg-gray-700 rounded text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Price ($)</label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={e => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2 bg-gray-700 rounded text-white text-sm"
                placeholder="Any"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Market Cap</label>
              <input
                type="number"
                value={filters.minMarketCap || ''}
                onChange={e => updateFilter('minMarketCap', e.target.value ? parseFloat(e.target.value) * 1e9 : undefined)}
                className="w-full p-2 bg-gray-700 rounded text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min 24h Change (%)</label>
              <input
                type="number"
                value={filters.minChange24h || ''}
                onChange={e => updateFilter('minChange24h', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2 bg-gray-700 rounded text-white text-sm"
                placeholder="Any"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="flex-1 p-2 bg-gray-700 rounded text-white text-sm"
            >
              <option value="market_cap">Market Cap</option>
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="change_24h">24h Change</option>
              <option value="change_7d">7d Change</option>
            </select>

            <button
              onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-700 rounded text-white text-sm hover:bg-gray-600"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-red-600 rounded text-white text-sm hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left py-2">Token</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">24h</th>
              <th className="text-right py-2">Market Cap</th>
              <th className="text-right py-2">Volume</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.map(token => (
              <tr key={token.id} className="border-b border-gray-800 hover:bg-gray-800">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {token.image && (
                      <img src={token.image} alt={token.symbol} className="w-5 h-5 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium">{token.symbol.toUpperCase()}</div>
                      <div className="text-xs text-gray-400">{token.name}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right py-2">
                  ${token.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </td>
                <td className={`text-right py-2 ${token.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {token.price_change_percentage_24h?.toFixed(2)}%
                </td>
                <td className="text-right py-2 text-gray-300">
                  ${formatNumber(token.market_cap)}
                </td>
                <td className="text-right py-2 text-gray-300">
                  ${formatNumber(token.total_volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTokens.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No tokens match your filters. Try adjusting them.
          </div>
        )}
      </div>
    </div>
  );
}
