import { useState } from 'react';
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

  // Update alert prices when realtime prices change
  if (Object.keys(realtimePrices).length > 0) {
    const prices: Record<string, { usd: number }> = {};
    for (const [id, update] of Object.entries(realtimePrices)) {
      prices[id] = { usd: update.price };
    }
    updateAlertPrices(prices);
  }

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
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Price Alerts</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
        >
          + Add Alert
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-800 rounded space-y-2">
          <select
            value={selectedToken}
            onChange={e => setSelectedToken(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded text-white"
          >
            <option value="">Select Token</option>
            {tokens.slice(0, 20).map(t => (
              <option key={t.id} value={t.id}>
                {t.symbol.toUpperCase()} - ${t.current_price.toLocaleString()}
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={e => setCondition(e.target.value as 'above' | 'below')}
            className="w-full p-2 bg-gray-700 rounded text-white"
          >
            <option value="above">Price goes above</option>
            <option value="below">Price goes below</option>
          </select>

          <input
            type="number"
            placeholder="Target Price (USD)"
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded text-white"
            step="0.01"
          />

          <div className="flex gap-2">
            <button
              onClick={handleAddAlert}
              className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
              disabled={!selectedToken || !targetPrice}
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-auto">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No price alerts set. Add one to get notified!
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-2 rounded ${
                !alert.enabled ? 'opacity-50' : 'bg-gray-800'
              }`}
            >
              <div className="flex-1">
                <div className="font-medium">{alert.tokenSymbol.toUpperCase()}</div>
                <div className="text-sm text-gray-400">
                  {alert.condition} ${alert.targetPrice.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Current: ${alert.currentPrice.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`px-2 py-1 rounded text-xs ${
                    alert.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {alert.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
