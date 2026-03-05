/**
 * Web3 Utility Functions
 * Helper functions for Ethereum operations
 */

import {
  formatUnits,
  parseUnits,
  getAddress,
  isAddress,
  keccak256,
  toUtf8Bytes,
  ZeroAddress,
  BrowserProvider,
  type JsonRpcSigner,
} from 'ethers';
import type {
  TransactionReceipt as EthersTransactionReceipt,
} from 'ethers';
import type {
  TransactionReceipt,
} from '../types/web3.ts';
import { WalletError } from '../types/web3.ts';

// Address utilities
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

export function normalizeAddress(address: string): string {
  return getAddress(address);
}

export function isZeroAddress(address: string): boolean {
  return address === ZeroAddress;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!isValidAddress(address)) {
    throw new Error('Invalid address');
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function shortenTxHash(hash: string, chars = 6): string {
  if (!hash.startsWith('0x') || hash.length !== 66) {
    throw new Error('Invalid transaction hash');
  }
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

// Balance formatting
export function formatBalance(balance: bigint, decimals = 18, maxDecimals = 4): string {
  const formatted = formatUnits(balance, decimals);
  const parts = formatted.split('.');
  const integer = parts[0] ?? '0';
  const fraction = parts[1];

  if (!fraction) return integer;

  // Trim trailing zeros and limit decimals
  const trimmedFraction = fraction.slice(0, maxDecimals).replace(/0+$/, '');

  if (trimmedFraction === '') return integer;
  return `${integer}.${trimmedFraction}`;
}

export function parseBalance(amount: string, decimals = 18): bigint {
  return parseUnits(amount, decimals);
}

// Wei conversion helpers
export function ethToWei(eth: string | number): bigint {
  return parseUnits(String(eth), 18);
}

export function weiToEth(wei: bigint): string {
  return formatUnits(wei, 18);
}

export function gweiToWei(gwei: string | number): bigint {
  return parseUnits(String(gwei), 'gwei');
}

export function weiToGwei(wei: bigint): string {
  return formatUnits(wei, 'gwei');
}

// Transaction receipt conversion
export function toTransactionReceipt(receipt: EthersTransactionReceipt): TransactionReceipt {
  return {
    hash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    from: receipt.from,
    to: receipt.to,
    contractAddress: receipt.contractAddress ?? null,
    status: receipt.status ?? 0,
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.gasPrice ?? 0n,
  };
}

// Error handling
export function parseWalletError(error: unknown): WalletError {
  const message = error instanceof Error ? error.message : String(error);

  // MetaMask user rejection
  if (message.includes('user rejected') || message.includes('User denied')) {
    return new WalletError('USER_REJECTED', 'Transaction rejected by user', error);
  }

  // Wallet not installed
  if (message.includes('No Ethereum provider') || message.includes('MetaMask not installed')) {
    return new WalletError('WALLET_NOT_INSTALLED', 'MetaMask is not installed', error);
  }

  // Wallet not connected
  if (message.includes('not connected') || message.includes('No accounts')) {
    return new WalletError('WALLET_NOT_CONNECTED', 'Wallet is not connected', error);
  }

  // Wrong network
  if (message.includes('chain') || message.includes('network') || message.includes('switch')) {
    return new WalletError('WRONG_NETWORK', 'Connected to wrong network', error);
  }

  // Insufficient funds
  if (message.includes('insufficient funds') || message.includes('gas required exceeds')) {
    return new WalletError('INSUFFICIENT_FUNDS', 'Insufficient funds for transaction', error);
  }

  // Contract error
  if (message.includes('call revert') || message.includes('execution reverted')) {
    return new WalletError('CONTRACT_ERROR', 'Contract execution failed', error);
  }

  // Transaction failed
  if (message.includes('transaction failed') || message.includes('reverted')) {
    return new WalletError('TRANSACTION_FAILED', 'Transaction failed', error);
  }

  // Unknown error
  return new WalletError('UNKNOWN_ERROR', message, error);
}

// Check if MetaMask is installed
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true;
}

// Wait for transaction confirmation
export async function waitForTransaction(
  provider: BrowserProvider,
  txHash: string,
  confirmations = 1,
  timeout = 60000
): Promise<TransactionReceipt> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt && (await receipt.confirmations()) >= confirmations) {
      return toTransactionReceipt(receipt);
    }

    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Transaction confirmation timeout for ${txHash}`);
}

// Get transaction status
export async function getTransactionStatus(
  provider: BrowserProvider,
  txHash: string
): Promise<'pending' | 'success' | 'failed' | 'not_found'> {
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) return 'pending';
  if (receipt.status === 1) return 'success';
  return 'failed';
}

// Hash utilities
export function hashMessage(message: string): string {
  return keccak256(toUtf8Bytes(message));
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// Compare addresses (case-insensitive)
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Check if address is in list
export function isAddressInList(address: string, list: readonly string[]): boolean {
  const normalized = address.toLowerCase();
  return list.some(a => a.toLowerCase() === normalized);
}

// Get provider and signer
export async function getProviderAndSigner(): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
} | null> {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();

  return { provider, signer };
}

// Format gas price
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = Number(formatUnits(gasPrice, 'gwei'));
  return `${gwei.toFixed(2)} Gwei`;
}

// Estimate gas with buffer
export function estimateGasWithBuffer(estimated: bigint, bufferPercent = 20): bigint {
  const buffer = (estimated * BigInt(bufferPercent)) / 100n;
  return estimated + buffer;
}
