import { useGasPrice } from '../../hooks/useGasPrice';
import { useTokenPrice } from '../../hooks/useTokenPrices';

export function GasTracker() {
  const { data: gas, isLoading } = useGasPrice();
  const { data: ethPrice } = useTokenPrice('ethereum');

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-800 rounded-lg" />;

  const gasPrice = gas?.average.price || 20;
  const ethPriceUsd = ethPrice?.ethereum?.usd || 2000;

  // Standard transaction costs (21,000 gas)
  const standardTx = 21000;
  const swapTx = 150000;
  const tokenTransfer = 65000;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Gas Prices</h2>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-800 rounded">
          <div className="text-sm text-gray-400">Slow</div>
          <div className="text-lg font-bold">{gas?.slow.price || 0}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>
        <div className="text-center p-2 bg-green-900/30 border border-green-700 rounded">
          <div className="text-sm text-gray-400">Average</div>
          <div className="text-lg font-bold text-green-500">{gas?.average.price || 0}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>
        <div className="text-center p-2 bg-gray-800 rounded">
          <div className="text-sm text-gray-400">Fast</div>
          <div className="text-lg font-bold">{gas?.fast.price || 0}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Standard Transfer</span>
          <span>${((gasPrice * standardTx * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Token Transfer</span>
          <span>${((gasPrice * tokenTransfer * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Swap Transaction</span>
          <span>${((gasPrice * swapTx * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
      </div>

      {gas?.lastBlock && (
        <div className="mt-4 text-xs text-gray-500">
          Block: {gas.lastBlock.toLocaleString()}
        </div>
      )}
    </div>
  );
}
