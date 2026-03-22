import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export function AccountBalance() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  if (!isConnected) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="text-gray-400 text-sm">Balance</div>
      <div className="text-2xl font-bold">{balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} ETH</div>
    </div>
  );
}
