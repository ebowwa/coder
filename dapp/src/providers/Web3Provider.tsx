/**
 * Web3 Provider Component
 * Wraps the application with Ethereum wallet context
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  BrowserProvider,
  JsonRpcSigner,
  formatUnits,
} from 'ethers';
import type {
  AccountState,
  Eip1193Provider,
} from '../types/web3.ts';
import { WalletError } from '../types/web3.ts';
import {
  DEFAULT_CHAIN_ID,
  getChain,
  getSwitchChainParams,
  isSupportedChain,
} from '../config/chains.ts';
import {
  isMetaMaskInstalled,
  parseWalletError,
  shortenAddress,
} from '../utils/web3.ts';

// Context state
interface Web3ContextState extends AccountState {
  // Provider and signer
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;

  // Balance
  balance: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;

  // Utilities
  isMetaMaskInstalled: boolean;
  shortenAddress: (address: string) => string;

  // Chain info
  chainName: string;
  chainSymbol: string;
  isSupportedChain: boolean;
}

// Create context with default values
const Web3Context = createContext<Web3ContextState | null>(null);

// Provider props
interface Web3ProviderProps {
  children: ReactNode;
  defaultChainId?: number;
  autoConnect?: boolean;
  onError?: (error: WalletError) => void;
  onChainChanged?: (chainId: number) => void;
  onAccountChanged?: (address: string | null) => void;
}

// Local storage key for auto-reconnect
const CONNECTED_KEY = 'web3_connected';

export function Web3Provider({
  children,
  defaultChainId: _defaultChainId = DEFAULT_CHAIN_ID,
  autoConnect = true,
  onError,
  onChainChanged,
  onAccountChanged,
}: Web3ProviderProps) {
  void _defaultChainId; // Reserved for future use
  // State
  const [account, setAccount] = useState<AccountState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    status: 'disconnected',
    error: null,
  });

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const isInitializing = useRef(false);
  const ethereumRef = useRef<Eip1193Provider | null>(null);

  // Get chain info
  const chainConfig = account.chainId ? getChain(account.chainId) : null;
  const chainName = chainConfig?.chainName ?? 'Unknown Network';
  const chainSymbol = chainConfig?.nativeCurrency.symbol ?? 'ETH';
  const isChainSupported = account.chainId ? isSupportedChain(account.chainId) : false;

  // Handle errors
  const handleError = useCallback((error: unknown) => {
    const walletError = parseWalletError(error);
    setAccount(prev => ({ ...prev, error: walletError, status: 'error' }));
    onError?.(walletError);
    return walletError;
  }, [onError]);

  // Update account and balance
  const updateAccount = useCallback(async (
    newProvider: BrowserProvider,
    newSigner: JsonRpcSigner
  ) => {
    try {
      const address = await newSigner.getAddress();
      const chainId = Number(await newProvider.send('eth_chainId', []));
      const balanceWei = await newProvider.getBalance(address);
      const balanceFormatted = formatUnits(balanceWei, 18);

      setAccount({
        address,
        chainId,
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        status: 'connected',
        error: null,
      });

      setProvider(newProvider);
      setSigner(newSigner);
      setBalance(balanceFormatted);

      onAccountChanged?.(address);
      onChainChanged?.(chainId);
    } catch (error) {
      handleError(error);
    }
  }, [handleError, onAccountChanged, onChainChanged]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      handleError(new Error('MetaMask is not installed'));
      return;
    }

    if (account.isConnecting) return;

    setAccount(prev => ({ ...prev, isConnecting: true, status: 'connecting' }));

    try {
      const ethereum = window.ethereum!;
      ethereumRef.current = ethereum;

      // Request account access
      await ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      const newProvider = new BrowserProvider(ethereum);
      const newSigner = await newProvider.getSigner();

      await updateAccount(newProvider, newSigner);

      // Save connected state for auto-reconnect
      localStorage.setItem(CONNECTED_KEY, 'true');
    } catch (error) {
      handleError(error);
      localStorage.removeItem(CONNECTED_KEY);
    }
  }, [account.isConnecting, handleError, updateAccount]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAccount({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      status: 'disconnected',
      error: null,
    });

    setProvider(null);
    setSigner(null);
    setBalance(null);

    localStorage.removeItem(CONNECTED_KEY);
    onAccountChanged?.(null);
  }, [onAccountChanged]);

  // Switch chain
  const switchChain = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      handleError(new Error('No Ethereum provider'));
      return;
    }

    try {
      const params = getSwitchChainParams(chainId);

      try {
        // Try to switch to the chain
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: params.chainId }],
        });
      } catch (switchError: unknown) {
        const error = switchError as { code?: number };
        // Chain not added to wallet
        if (error.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [params],
          });
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!provider || !account.address) return;

    try {
      const balanceWei = await provider.getBalance(account.address);
      setBalance(formatUnits(balanceWei, 18));
    } catch (error) {
      // Silent fail for balance refresh
      console.error('Failed to refresh balance:', error);
    }
  }, [provider, account.address]);

  // Auto-connect on mount
  useEffect(() => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    const tryAutoConnect = async () => {
      const wasConnected = localStorage.getItem(CONNECTED_KEY) === 'true';

      if (autoConnect && wasConnected && isMetaMaskInstalled()) {
        setAccount(prev => ({ ...prev, isReconnecting: true, status: 'connecting' }));

        try {
          const ethereum = window.ethereum!;
          ethereumRef.current = ethereum;

          // Check if already connected
          const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];

          if (accounts.length > 0) {
            const newProvider = new BrowserProvider(ethereum);
            const newSigner = await newProvider.getSigner();
            await updateAccount(newProvider, newSigner);
          } else {
            setAccount(prev => ({
              ...prev,
              isReconnecting: false,
              status: 'disconnected',
            }));
          }
        } catch {
          localStorage.removeItem(CONNECTED_KEY);
          setAccount(prev => ({
            ...prev,
            isReconnecting: false,
            status: 'disconnected',
          }));
        }
      }
    };

    tryAutoConnect();
  }, [autoConnect, updateAccount]);

  // Setup event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const ethereum = window.ethereum;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        disconnect();
      } else if (account.address && accountList[0] && accountList[0].toLowerCase() !== account.address.toLowerCase()) {
        // Reconnect with new account
        connect();
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const newChainId = parseInt(chainIdHex as string, 16);

      setAccount(prev => ({
        ...prev,
        chainId: newChainId,
      }));

      onChainChanged?.(newChainId);

      // Refresh provider and signer on chain change
      if (provider && signer) {
        updateAccount(provider, signer);
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    ethereum.on('disconnect', handleDisconnect);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
      ethereum.removeListener('disconnect', handleDisconnect);
    };
  }, [account.address, connect, disconnect, onChainChanged, provider, signer, updateAccount]);

  // Context value
  const value: Web3ContextState = {
    // Account state
    ...account,
    // Provider and signer
    provider,
    signer,
    // Balance
    balance,
    // Actions
    connect,
    disconnect,
    switchChain,
    refreshBalance,
    // Utilities
    isMetaMaskInstalled: isMetaMaskInstalled(),
    shortenAddress: (address: string) => shortenAddress(address),
    // Chain info
    chainName,
    chainSymbol,
    isSupportedChain: isChainSupported,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

// Hook to use Web3 context
export function useWeb3(): Web3ContextState {
  const context = useContext(Web3Context);

  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }

  return context;
}

// Export types
export type { Web3ContextState, Web3ProviderProps };
