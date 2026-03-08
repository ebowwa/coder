/**
 * useConnect Hook
 * Wallet connection and disconnection
 */

import { useCallback, useState } from 'react';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import type { ConnectionStatus } from '../types/web3.ts';

export interface UseConnectReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  status: ConnectionStatus;
  error: Error | null;

  // Connection status text
  statusText: string;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  toggle: () => Promise<void>;

  // Utilities
  isMetaMaskInstalled: boolean;
  needsInstall: boolean;
}

export function useConnect(): UseConnectReturn {
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    status,
    error,
    connect,
    disconnect,
    isMetaMaskInstalled,
  } = useWeb3();

  const [isToggling, setIsToggling] = useState(false);

  // Status text helper
  const getStatusText = (): string => {
    switch (status) {
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'disconnecting':
        return 'Disconnecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  // Toggle connection
  const toggle = useCallback(async () => {
    if (isToggling) return;

    setIsToggling(true);

    try {
      if (isConnected) {
        disconnect();
      } else {
        await connect();
      }
    } finally {
      setIsToggling(false);
    }
  }, [isConnected, isToggling, connect, disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting: isConnecting || isToggling,
    isReconnecting,
    status,
    error,

    // Connection status text
    statusText: getStatusText(),

    // Actions
    connect,
    disconnect,
    toggle,

    // Utilities
    isMetaMaskInstalled,
    needsInstall: !isMetaMaskInstalled,
  };
}

export default useConnect;
