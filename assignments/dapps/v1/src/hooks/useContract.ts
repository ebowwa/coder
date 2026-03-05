/**
 * useContract Hook
 * Generic contract interaction hook
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Contract, type InterfaceAbi, type BrowserProvider, type JsonRpcSigner } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import type {
  ContractReadResult,
  ContractWriteResult,
  UseContractReadOptions,
  UseContractWriteOptions,
  TransactionReceipt,
} from '../types/web3.ts';
import { WalletError } from '../types/web3.ts';
import {
  parseWalletError,
  toTransactionReceipt,
  retryWithBackoff,
} from '../utils/web3.ts';

export interface UseContractOptions {
  address: string;
  abi: InterfaceAbi;
}

export interface UseContractReturn {
  contract: Contract | null;
  address: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Base hook for contract instance
 */
export function useContract(options: UseContractOptions): UseContractReturn {
  const { address, abi } = options;
  const { provider, signer, isConnected } = useWeb3();

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isConnected || !provider) {
      setContract(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use signer for write operations, provider for read-only
      const runner: BrowserProvider | JsonRpcSigner = signer ?? provider;
      const contractInstance = new Contract(address, abi, runner);
      setContract(contractInstance);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setContract(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, abi, provider, signer, isConnected]);

  return {
    contract,
    address,
    isLoading,
    error,
  };
}

/**
 * Hook for reading from a contract
 */
export interface UseContractReadArgs {
  address: string;
  abi: InterfaceAbi;
  functionName: string;
  args?: readonly unknown[];
  options?: UseContractReadOptions;
}

export function useContractRead<T = unknown>(
  args: UseContractReadArgs
): ContractReadResult<T> {
  const { address, abi, functionName, args: callArgs = [], options = {} } = args;
  const { provider, isConnected, chainId } = useWeb3();

  const {
    enabled = true,
    staleTime = 0,
    refetchInterval,
    refetchOnWindowFocus = true,
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const lastFetchTime = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !isConnected || !provider) {
      return;
    }

    // Check stale time
    const now = Date.now();
    if (staleTime > 0 && now - lastFetchTime.current < staleTime) {
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const contract = new Contract(address, abi, provider);
      const fn = contract.getFunction(functionName);
      if (!fn) throw new Error(`Function ${functionName} not found`);
      const result = await retryWithBackoff(
        () => fn(...callArgs),
        2
      );

      setData(result as T);
      lastFetchTime.current = now;
    } catch (err) {
      setIsError(true);
      setError(parseWalletError(err));
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [address, abi, functionName, callArgs, enabled, isConnected, provider, staleTime]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, chainId]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for writing to a contract
 */
export interface UseContractWriteArgs {
  address: string;
  abi: InterfaceAbi;
  functionName: string;
  options?: UseContractWriteOptions;
}

export function useContractWrite(
  args: UseContractWriteArgs
): ContractWriteResult {
  const { address, abi, functionName, options = {} } = args;
  const { signer, isConnected, provider } = useWeb3();
  const { onSuccess, onError, onSettled } = options;

  const [hash, setHash] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  const reset = useCallback(() => {
    setHash(null);
    setStatus('idle');
    setIsLoading(false);
    setIsError(false);
    setError(null);
    setReceipt(null);
  }, []);

  const writeAsync = useCallback(async (...callArgs: unknown[]): Promise<string> => {
    if (!isConnected || !signer || !provider) {
      throw new WalletError('WALLET_NOT_CONNECTED', 'Wallet not connected');
    }

    reset();
    setIsLoading(true);
    setStatus('pending');

    try {
      const contract = new Contract(address, abi, signer);
      const fn = contract.getFunction(functionName);
      if (!fn) throw new Error(`Function ${functionName} not found`);
      const tx = await fn(...callArgs);

      setHash(tx.hash);
      setStatus('confirming');

      // Wait for confirmation
      const txReceipt = await tx.wait();
      const formattedReceipt = toTransactionReceipt(txReceipt);

      setReceipt(formattedReceipt);
      setStatus('success');
      setIsLoading(false);

      onSuccess?.(tx.hash);
      onSettled?.();

      return tx.hash;
    } catch (err) {
      const walletError = parseWalletError(err);

      setIsError(true);
      setError(walletError);
      setStatus('error');
      setIsLoading(false);

      onError?.(walletError);
      onSettled?.();

      throw walletError;
    }
  }, [address, abi, functionName, isConnected, signer, provider, onSuccess, onError, onSettled, reset]);

  const write = useCallback(async (...callArgs: unknown[]): Promise<string | null> => {
    try {
      return await writeAsync(...callArgs);
    } catch {
      return null;
    }
  }, [writeAsync]);

  return {
    write,
    writeAsync,
    hash,
    status,
    isLoading,
    isError,
    error,
    receipt,
    reset,
  };
}

export default useContract;
