import { useConnect, useAccount, useDisconnect } from 'wagmi';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
        <button onClick={() => disconnect()} className="px-3 py-1 bg-red-600 rounded">Disconnect</button>
      </div>
    );
  }

  const connector = connectors[0];
  return <button onClick={() => connector && connect({ connector })} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Connect Wallet</button>;
}
