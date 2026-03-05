/**
 * useAccount Hook
 * Access wallet address, chain ID, and connection state
 */

import { useWeb3 } from '../providers/Web3Provider.tsx';
import type { AccountState } from '../types/web3.ts';

export interface UseAccountReturn extends AccountState {
  // Balance
  balance: string | null;

  // Chain info
  chainName: string;
  chainSymbol: string;
  isSupportedChain: boolean;

  // Shortcuts
  isMainnet: boolean;
  isTestnet: boolean;
  isLocalhost: boolean;

  // Display helpers
  displayAddress: string;
  displayBalance: string;
}

export function useAccount(): UseAccountReturn {
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    isReconnecting,
    status,
    error,
    balance,
    chainName,
    chainSymbol,
    isSupportedChain,
    shortenAddress,
  } = useWeb3();

  // Chain type checks
  const isMainnet = chainId === 1 || chainId === 137 || chainId === 42161 || chainId === 10 || chainId === 8453;
  const isTestnet = chainId === 11155111 || chainId === 5;
  const isLocalhost = chainId === 31337;

  // Display helpers
  const displayAddress = address ? shortenAddress(address) : 'Not connected';
  const displayBalance = balance ? `${balance} ${chainSymbol}` : '0 ETH';

  return {
    // Account state
    address,
    chainId,
    isConnected,
    isConnecting,
    isReconnecting,
    status,
    error,

    // Balance
    balance,

    // Chain info
    chainName,
    chainSymbol,
    isSupportedChain,

    // Shortcuts
    isMainnet,
    isTestnet,
    isLocalhost,

    // Display helpers
    displayAddress,
    displayBalance,
  };
}

export default useAccount;
