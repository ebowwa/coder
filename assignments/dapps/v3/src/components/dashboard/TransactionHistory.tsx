import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import type { Transaction } from '../../types/portfolio';

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    setTimeout(() => {
      setTransactions([]);
      setIsLoading(false);
    }, 500);
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="card relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

        <div className="text-center py-12 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="text-gray-400 font-medium mb-2">Connect Wallet</div>
          <div className="text-gray-500 text-sm">View your transaction history</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="card hover-lift relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-400 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <span className="metric-label">Recent Transactions</span>
      </div>

      {/* Transaction List */}
      <div className="relative z-10">
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div className="text-gray-400 font-medium">No recent transactions</div>
            <div className="text-gray-500 text-sm mt-1">Your activity will appear here</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {transactions.map(tx => {
              const statusColors = {
                confirmed: 'bg-green-400 shadow-green-500/30',
                pending: 'bg-yellow-400 shadow-yellow-500/30',
                failed: 'bg-red-400 shadow-red-500/30',
              };
              return (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${statusColors[tx.status]} shadow-lg`} />
                    <div>
                      <div className="font-medium text-white">Transfer</div>
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-white font-medium">
                      {tx.value ? `${Number(tx.value) / 1e18} ETH` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 relative z-10">
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
        >
          <span>View all transactions on Etherscan</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
