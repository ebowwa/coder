import { useAccount, useWatchContractEvent } from 'wagmi';
import { erc20Abi } from 'viem';
import { useState, useEffect } from 'react';
import type { Transaction } from '../../types/portfolio';

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - in production, you'd use Etherscan or The Graph
  useEffect(() => {
    if (!isConnected || !address) return;

    // Simulate fetching transactions
    setIsLoading(true);
    setTimeout(() => {
      setTransactions([]);
      setIsLoading(false);
    }, 500);
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-400">
        Connect wallet to view transactions
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>

      {transactions.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">📭</div>
          <div>No recent transactions</div>
          <div className="text-sm mt-2">Your transaction history will appear here</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-auto">
          {transactions.map(tx => (
            <div key={tx.hash} className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  tx.status === 'confirmed' ? 'bg-green-500' :
                  tx.status === 'pending' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div>
                  <div className="font-medium">Transfer</div>
                  <div className="text-xs text-gray-400">
                    {new Date(tx.timestamp * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium">
                  {tx.value ? `${Number(tx.value) / 1e18} ETH` : 'N/A'}
                </div>
                <div className="text-gray-400">
                  {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View all transactions on Etherscan →
        </a>
      </div>
    </div>
  );
}
