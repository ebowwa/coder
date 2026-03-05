import { type FC, useState, useCallback } from 'react';
import type { WalletConnectProps, WalletStatus } from '../types/index.ts';

export const WalletConnect: FC<WalletConnectProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async (): Promise<void> => {
    setStatus('connecting');

    // Simulate wallet connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock address for placeholder
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
    setAddress(mockAddress);
    setStatus('connected');
  }, []);

  const disconnect = useCallback((): void => {
    setAddress(null);
    setStatus('disconnected');
  }, []);

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (status === 'connected' && address) {
    return (
      <div className={`wallet-connect ${className}`}>
        <span className="wallet-address">{formatAddress(address)}</span>
        <button
          type="button"
          onClick={disconnect}
          className="btn btn-secondary"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={status === 'connecting'}
      className={`btn btn-primary ${className}`}
    >
      {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
