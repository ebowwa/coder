import { useState, useEffect, useRef } from 'react';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';
import { useMarketData } from '../../hooks/useMarketData';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';

export function PriceAlerts() {
  const { alerts, addAlert, removeAlert, toggleAlert, updateAlertPrices, requestNotificationPermission } = usePriceAlerts();
  const { tokens } = useMarketData(50);
  const realtimePrices = useRealtimePrices(
    alerts.map(a => a.tokenId),
    alerts.length > 0
  );
  const prevPricesRef = useRef<string>('');

  useEffect(() => {
    const priceKeys = Object.keys(realtimePrices);
    if (priceKeys.length === 0) return;

    const prices: Record<string, { usd: number }> = {};
    for (const [id, update] of Object.entries(realtimePrices)) {
      prices[id] = { usd: update.price };
    }

    const pricesKey = JSON.stringify(prices);
    if (prevPricesRef.current !== pricesKey) {
      prevPricesRef.current = pricesKey;
      updateAlertPrices(prices);
    }
  }, [realtimePrices, updateAlertPrices]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');

  const handleAddAlert = () => {
    if (!selectedToken || !targetPrice) return;

    const token = tokens.find(t => t.id === selectedToken);
    if (!token) return;

    addAlert({
      tokenId: token.id,
      tokenSymbol: token.symbol,
      condition,
      targetPrice: parseFloat(targetPrice),
      currentPrice: token.current_price,
      enabled: true,
    });

    setSelectedToken('');
    setTargetPrice('');
    setShowAddForm(false);
    requestNotificationPermission();
  };

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 12.75h3.75l-1.054-1.054A1.524 1.524 0 0113.5 10.618V8.25a4.5 4.5 0 00-3-4.244V3.75a1.5 1.5 0 00-3 0v.256A4.5 4.5 0 004.5 8.25v2.368c0 .404-.16.791-.446 1.078L3 12.75h3.75m4.5 0v.75a2.25 2.25 0 01-4.5 0v-.75m4.5 0H6.75" />
            </svg>
          </div>
          <span className="metric-label">Price Alerts</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary text-xs px-3 py-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {/* Add Alert Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-slate-900/50 rounded-xl border border-gray-800/50 space-y-3 relative z-10 animate-fade-in">
          <select
            value={selectedToken}
            onChange={e => setSelectedToken(e.target.value)}
            className="w-full p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
          >
            <option value="">Select Token</option>
            {tokens.slice(0, 20).map(t => (
              <option key={t.id} value={t.id}>
                {t.symbol.toUpperCase()} - ${t.current_price.toLocaleString()}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as 'above' | 'below')}
              className="flex-1 p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
            >
              <option value="above">Price above</option>
              <option value="below">Price below</option>
            </select>

            <input
              type="number"
              placeholder="Target Price"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="flex-1 p-2.5 bg-slate-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 transition-all"
              step="0.01"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAlert}
              disabled={!selectedToken || !targetPrice}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Alert
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2 max-h-48 overflow-auto relative z-10">
        {alerts.length === 0 ? (
          <div className="text-center py-8 relative">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-xl" />

            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4 animate-float">
                <svg className="w-8 h-8 text-yellow-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 12.75h3.75l-1.054-1.054A1.524 1.524 0 0113.5 10.618V8.25a4.5 4.5 0 00-3-4.244V3.75a1.5 1.5 0 00-3 0v.256A4.5 4.5 0 004.5 8.25v2.368c0 .404-.16.791-.446 1.078L3 12.75h3.75m4.5 0v.75a2.25 2.25 0 01-4.5 0v-.75m4.5 0H6.75" />
                </svg>
              </div>
              <div className="text-white font-semibold mb-1">No Active Alerts</div>
              <div className="text-gray-400 text-sm mb-4">Set price alerts to get notified when prices hit your targets</div>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-semibold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Alert
              </button>
            </div>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-700/30 ${
                !alert.enabled ? 'opacity-50 bg-slate-900/30' : 'bg-slate-800/30 border border-gray-800/50 hover:border-gray-700/50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{alert.tokenSymbol.toUpperCase()}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-gray-400">
                    {alert.condition}
                  </span>
                </div>
                <div className="text-sm text-gray-400 font-mono mt-0.5">
                  ${alert.targetPrice.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`relative w-10 h-5 rounded-full transition-all ${
                    alert.enabled ? 'bg-green-500/30' : 'bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                    alert.enabled ? 'left-5 bg-green-400 shadow-lg shadow-green-500/30' : 'left-0.5 bg-gray-500'
                  }`} />
                </button>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
          <span className="text-xs text-gray-500">{alerts.filter(a => a.enabled).length} active</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 12.75h3.75l-1.054-1.054A1.524 1.524 0 0113.5 10.618V8.25a4.5 4.5 0 00-3-4.244V3.75a1.5 1.5 0 00-3 0v.256A4.5 4.5 0 004.5 8.25v2.368c0 .404-.16.791-.446 1.078L3 12.75h3.75m4.5 0v.75a2.25 2.25 0 01-4.5 0v-.75m4.5 0H6.75" />
            </svg>
            Browser notifications
          </div>
        </div>
      )}
    </div>
  );
}
