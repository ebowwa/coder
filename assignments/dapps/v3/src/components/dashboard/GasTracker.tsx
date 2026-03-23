import { useGasPrice } from '../../hooks/useGasPrice';
import { useTokenPrice } from '../../hooks/useTokenPrices';

export function GasTracker() {
  const { data: gas, isLoading } = useGasPrice();
  const { data: ethPrice } = useTokenPrice('ethereum');

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-24 w-full mb-4" />
        <div className="skeleton h-4 w-full" />
      </div>
    );
  }

  const gasPrice = gas?.average.price || 20;
  const ethPriceUsd = ethPrice?.ethereum?.usd || 2000;

  // Standard transaction costs
  const standardTx = 21000;
  const swapTx = 150000;
  const tokenTransfer = 65000;

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <span className="metric-label">Gas Prices</span>
      </div>

      {/* Gas Tiers */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        <div className="text-center p-3 bg-slate-800/30 rounded-xl border border-gray-800/50 hover:bg-slate-700/40 transition-colors">
          <div className="text-xs text-gray-400 mb-1 font-medium">Slow</div>
          <div className="text-xl font-bold text-white number-mono">{gas?.slow.price || 0}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">GWEI</div>
        </div>
        <div className="text-center p-3 bg-green-500/10 rounded-xl border border-green-500/30 relative">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 rounded-full text-[10px] font-bold text-white">
            BEST
          </div>
          <div className="text-xs text-gray-400 mb-1 font-medium">Average</div>
          <div className="text-xl font-bold text-green-400 number-mono">{gas?.average.price || 0}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">GWEI</div>
        </div>
        <div className="text-center p-3 bg-slate-800/30 rounded-xl border border-gray-800/50 hover:bg-slate-700/40 transition-colors">
          <div className="text-xs text-gray-400 mb-1 font-medium">Fast</div>
          <div className="text-xl font-bold text-white number-mono">{gas?.fast.price || 0}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">GWEI</div>
        </div>
      </div>

      {/* Transaction Costs */}
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Standard Transfer
          </div>
          <span className="font-mono text-white font-medium">${((gasPrice * standardTx * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Token Transfer
          </div>
          <span className="font-mono text-white font-medium">${((gasPrice * tokenTransfer * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Swap Transaction
          </div>
          <span className="font-mono text-white font-medium">${((gasPrice * swapTx * ethPriceUsd) / 1e9).toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      {gas?.lastBlock && (
        <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">Block #{gas.lastBlock.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
