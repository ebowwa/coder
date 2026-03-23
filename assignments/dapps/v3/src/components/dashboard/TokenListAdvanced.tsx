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
    <div className="card hover-lift relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="metric-label">Token Explorer</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            <span className="text-white font-semibold">{filteredTokens.length}</span>
            <span className="text-gray-500"> / {tokens.length}</span>
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showFilters
                ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25'
                : 'text-gray-400 bg-slate-800/50 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative z-10">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-slate-900/50 rounded-xl border border-gray-800/50 space-y-4 relative z-10 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Min Price ($)</label>
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={e => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Max Price ($)</label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={e => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
                placeholder="Any"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Min Market Cap (B)</label>
              <input
                type="number"
                value={filters.minMarketCap ? filters.minMarketCap / 1e9 : ''}
                onChange={e => updateFilter('minMarketCap', e.target.value ? parseFloat(e.target.value) * 1e9 : undefined)}
                className="w-full p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Min 24h Change (%)</label>
              <input
                type="number"
                value={filters.minChange24h || ''}
                onChange={e => updateFilter('minChange24h', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
                placeholder="Any"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="flex-1 p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
            >
              <option value="market_cap">Market Cap</option>
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="change_24h">24h Change</option>
              <option value="change_7d">7d Change</option>
            </select>

            <button
              onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm hover:bg-slate-700/50 transition-all"
            >
              {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            <button
              onClick={resetFilters}
              className="px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm hover:bg-red-500/25 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="max-h-96 overflow-auto rounded-xl border border-gray-800/50 relative z-10">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 sticky top-0">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Token</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">24h</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">MCap</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredTokens.map(token => {
              const changePositive = token.price_change_percentage_24h >= 0;
              return (
                <tr key={token.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {token.image ? (
                        <img src={token.image} alt={token.symbol} className="w-7 h-7 rounded-full ring-1 ring-gray-700/50" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {token.symbol.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{token.symbol.toUpperCase()}</div>
                        <div className="text-xs text-gray-500">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="font-mono text-white">${token.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: token.current_price < 1 ? 6 : 2 })}</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      changePositive
                        ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}>
                      {changePositive ? '+' : ''}{token.price_change_percentage_24h?.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 hidden md:table-cell">
                    <span className="font-mono text-gray-300">${formatNumber(token.market_cap)}</span>
                  </td>
                  <td className="text-right py-3 px-4 hidden lg:table-cell">
                    <span className="font-mono text-gray-400">${formatNumber(token.total_volume)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTokens.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-gray-400 font-medium">No tokens match your filters</div>
            <div className="text-gray-500 text-sm mt-1">Try adjusting your search criteria</div>
          </div>
        )}
      </div>
    </div>
  );
}
