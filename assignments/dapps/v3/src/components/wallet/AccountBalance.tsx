import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export function AccountBalance() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  if (!isConnected) return null;

  const ethBalance = balance ? parseFloat(formatEther(balance.value)) : 0;
  const ethPrice = 2000; // Mock price, in production fetch from API
  const usdValue = ethBalance * ethPrice;

  return (
    <div className="card relative overflow-hidden bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border-blue-500/20">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-sm text-gray-400 font-medium">Connected Wallet Balance</span>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold text-white number-mono">
              {ethBalance.toFixed(4)}
            </div>
            <div className="text-xl text-gray-400 font-medium">ETH</div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-400">≈</span>
            <span className="text-lg text-gray-300 number-mono">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-sm text-gray-500">USD</span>
          </div>

          {/* Address display */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(address || '')}
              className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <a
              href={`https://etherscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-blue-400"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Visual Element */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>

          {/* Quick stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Connected</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500">Mainnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
