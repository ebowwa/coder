/**
 * Web3 Types for Ethereum Integration
 * Compatible with ethers.js v6
 */

import type { BrowserProvider, JsonRpcSigner, Contract } from 'ethers';

// Chain configuration
export interface ChainConfig {
  readonly chainId: number;
  readonly chainName: string;
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly rpcUrls: readonly string[];
  readonly blockExplorerUrls?: readonly string[];
  readonly iconUrls?: readonly string[];
}

// Wallet connection states
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected';

// Account state
export interface AccountState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  status: ConnectionStatus;
  error: Error | null;
}

// Provider state
export interface ProviderState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  isInitialized: boolean;
}

// Transaction states
export type TransactionStatus =
  | 'idle'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error';

export interface TransactionState {
  hash: string | null;
  status: TransactionStatus;
  error: Error | null;
  confirmations: number;
  receipt: TransactionReceipt | null;
}

// Simplified transaction receipt
export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  contractAddress: string | null;
  status: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
}

// Contract types
export interface ContractConfig {
  address: string;
  abi: readonly unknown[];
  chainId: number;
}

export interface ContractState<T extends Contract = Contract> {
  contract: T | null;
  address: string;
  isLoading: boolean;
  error: Error | null;
}

// Read contract hook options
export interface UseContractReadOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
}

// Write contract hook options
export interface UseContractWriteOptions {
  onSuccess?: (hash: string) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

// Contract read result
export interface ContractReadResult<T = unknown> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Contract write result
export interface ContractWriteResult {
  write: (...args: unknown[]) => Promise<string | null>;
  writeAsync: (...args: unknown[]) => Promise<string>;
  hash: string | null;
  status: TransactionStatus;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  receipt: TransactionReceipt | null;
  reset: () => void;
}

// Event filter options
export interface EventFilterOptions {
  fromBlock?: number | string;
  toBlock?: number | string;
  address?: string;
  topics?: readonly (string | null)[];
}

// Contract event log
export interface ContractEventLog<T = unknown> {
  eventName: string;
  args: T;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

// ERC20 Token types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export interface TokenBalance {
  address: string;
  balance: bigint;
  formatted: string;
}

// ERC721 NFT types
export interface NFTInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
}

export interface NFTMetadata {
  tokenId: bigint;
  uri: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: readonly Record<string, unknown>[];
}

export interface NFTOwnership {
  owner: string;
  tokenId: bigint;
  tokenURI: string;
}

// SimpleStorage contract types
export interface SimpleStorageState {
  value: bigint;
  isLoading: boolean;
  error: Error | null;
}

// Wallet events
export type WalletEventType =
  | 'accountsChanged'
  | 'chainChanged'
  | 'connect'
  | 'disconnect'
  | 'error';

export interface WalletEvent {
  type: WalletEventType;
  data?: unknown;
}

// Wallet error types
export type WalletErrorCode =
  | 'WALLET_NOT_INSTALLED'
  | 'WALLET_NOT_CONNECTED'
  | 'WRONG_NETWORK'
  | 'USER_REJECTED'
  | 'INSUFFICIENT_FUNDS'
  | 'CONTRACT_ERROR'
  | 'TRANSACTION_FAILED'
  | 'UNKNOWN_ERROR';

export class WalletError extends Error {
  constructor(
    public readonly code: WalletErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

// Ethereum provider interface (MetaMask)
export interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

// Window ethereum extension
declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      isConnected?: () => boolean;
      enable?: () => Promise<string[]>;
    };
  }
}

// React Query query key types
export type Web3QueryKey =
  | ['web3', 'account']
  | ['web3', 'chain']
  | ['web3', 'balance', string]
  | ['web3', 'contract', string, string]
  | ['web3', 'token', string, string]
  | ['web3', 'nft', string, string];
