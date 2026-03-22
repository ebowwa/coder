import { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';

export function TokenList() {
  const { tokens, isLoading } = useMarketData(100);
  const [search, setSearch] = useState('');

  const filtered = tokens.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <input
        type="text"
        placeholder="Search tokens..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full p-2 bg-gray-800 rounded mb-4 text-white"
      />
      <div className="max-h-64 overflow-auto">
        {filtered.map(token => (
          <div key={token.id} className="flex justify-between p-2 hover:bg-gray-800 rounded">
            <div className="flex items-center gap-2">
              <img src={token.image} alt="" className="w-5 h-5 rounded-full" />
              <span>{token.symbol.toUpperCase()}</span>
            </div>
            <span>${token.current_price.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
