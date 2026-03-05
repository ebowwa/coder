/**
 * useToken Hook
 * ERC20 Token contract interactions
 */

import { useCallback } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import { useContractRead, useContractWrite } from './useContract.ts';
import { ABIS, getContractAddress } from '../config/contracts.ts';
import type { TokenBalance, TransactionReceipt } from '../types/web3.ts';

export interface UseTokenReturn {
  // Token info
  name: string | undefined;
  symbol: string | undefined;
  decimals: number | undefined;
  totalSupply: bigint | undefined;
  isLoadingInfo: boolean;
  infoError: Error | null;

  // Balance
  balance: TokenBalance | null;
  isLoadingBalance: boolean;
  balanceError: Error | null;

  // Allowance
  allowance: bigint | undefined;
  isLoadingAllowance: boolean;

  // Transfer
  transfer: (to: string, amount: string) => Promise<string | null>;
  transferAsync: (to: string, amount: string) => Promise<string>;
  isTransferring: boolean;
  transferError: Error | null;
  transferHash: string | null;
  transferReceipt: TransactionReceipt | null;

  // Approve
  approve: (spender: string, amount: string) => Promise<string | null>;
  approveAsync: (spender: string, amount: string) => Promise<string>;
  isApproving: boolean;
  approveError: Error | null;
  approveHash: string | null;
  approveReceipt: TransactionReceipt | null;

  // Utilities
  refetchBalance: () => Promise<void>;
  refetchAllowance: (owner: string, spender: string) => Promise<void>;
  isContractDeployed: boolean;

  // Formatters
  formatAmount: (amount: bigint) => string;
  parseAmount: (amount: string) => bigint;
}

export interface UseTokenOptions {
  address?: string;
}

export function useToken(options: UseTokenOptions = {}): UseTokenReturn {
  const { address: customAddress } = options;
  const { chainId, isConnected, address: userAddress, provider: _provider } = useWeb3();

  // Get contract address
  const contractAddress = customAddress ?? (chainId ? getContractAddress(chainId, 'token') : null);
  const isContractDeployed = !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  // Token info reads
  const { data: name, isLoading: isLoadingName } = useContractRead<string>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'name',
    options: { enabled: isContractDeployed && isConnected },
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useContractRead<string>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'symbol',
    options: { enabled: isContractDeployed && isConnected },
  });

  const { data: decimals, isLoading: isLoadingDecimals } = useContractRead<number>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'decimals',
    options: { enabled: isContractDeployed && isConnected },
  });

  const { data: totalSupply, isLoading: isLoadingSupply } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'totalSupply',
    options: { enabled: isContractDeployed && isConnected },
  });

  // Balance
  const {
    data: balanceWei,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'balanceOf',
    args: [userAddress],
    options: {
      enabled: isContractDeployed && isConnected && !!userAddress,
      refetchInterval: 10000,
    },
  });

  // Allowance (needs to be fetched per spender)
  const {
    data: allowance,
    isLoading: isLoadingAllowance,
    refetch: _refetchAllowanceRaw,
  } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'allowance',
    args: [userAddress, ''], // Spender needs to be passed
    options: { enabled: false }, // Disabled by default
  });

  // Transfer
  const {
    write: transferWrite,
    writeAsync: transferWriteAsync,
    hash: transferHash,
    status: _transferStatus,
    isLoading: isTransferring,
    error: transferError,
    receipt: transferReceipt,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'transfer',
    options: {
      onSuccess: () => {
        refetchBalance();
      },
    },
  });

  // Approve
  const {
    write: approveWrite,
    writeAsync: approveWriteAsync,
    hash: approveHash,
    status: _approveStatus,
    isLoading: isApproving,
    error: approveError,
    receipt: approveReceipt,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc20,
    functionName: 'approve',
  });

  // Format balance
  const balance: TokenBalance | null = balanceWei !== undefined && decimals !== undefined
    ? {
      address: userAddress ?? '',
      balance: balanceWei,
      formatted: formatUnits(balanceWei, decimals),
    }
    : null;

  // Transfer wrapper
  const transfer = useCallback(async (to: string, amount: string): Promise<string | null> => {
    if (!isContractDeployed || decimals === undefined) {
      throw new Error('Token contract not available');
    }

    const amountWei = parseUnits(amount, decimals);
    return transferWrite(to, amountWei);
  }, [isContractDeployed, decimals, transferWrite]);

  const transferAsync = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!isContractDeployed || decimals === undefined) {
      throw new Error('Token contract not available');
    }

    const amountWei = parseUnits(amount, decimals);
    return transferWriteAsync(to, amountWei);
  }, [isContractDeployed, decimals, transferWriteAsync]);

  // Approve wrapper
  const approve = useCallback(async (spender: string, amount: string): Promise<string | null> => {
    if (!isContractDeployed || decimals === undefined) {
      throw new Error('Token contract not available');
    }

    const amountWei = parseUnits(amount, decimals);
    return approveWrite(spender, amountWei);
  }, [isContractDeployed, decimals, approveWrite]);

  const approveAsync = useCallback(async (spender: string, amount: string): Promise<string> => {
    if (!isContractDeployed || decimals === undefined) {
      throw new Error('Token contract not available');
    }

    const amountWei = parseUnits(amount, decimals);
    return approveWriteAsync(spender, amountWei);
  }, [isContractDeployed, decimals, approveWriteAsync]);

  // Refetch allowance with owner and spender
  const refetchAllowance = useCallback(async (_owner: string, _spender: string): Promise<void> => {
    // This would need to trigger a refetch with the correct args
    // Simplified version - would need to implement properly
    void _owner; void _spender;
  }, []);

  // Formatters
  const formatAmount = useCallback((amount: bigint): string => {
    if (decimals === undefined) return amount.toString();
    return formatUnits(amount, decimals);
  }, [decimals]);

  const parseAmount = useCallback((amount: string): bigint => {
    if (decimals === undefined) return BigInt(0);
    return parseUnits(amount, decimals);
  }, [decimals]);

  return {
    // Token info
    name,
    symbol,
    decimals,
    totalSupply,
    isLoadingInfo: isLoadingName || isLoadingSymbol || isLoadingDecimals || isLoadingSupply,
    infoError: null,

    // Balance
    balance,
    isLoadingBalance,
    balanceError: balanceError ?? null,

    // Allowance
    allowance,
    isLoadingAllowance,

    // Transfer
    transfer,
    transferAsync,
    isTransferring,
    transferError: transferError ?? null,
    transferHash,
    transferReceipt,

    // Approve
    approve,
    approveAsync,
    isApproving,
    approveError: approveError ?? null,
    approveHash,
    approveReceipt,

    // Utilities
    refetchBalance,
    refetchAllowance,
    isContractDeployed,

    // Formatters
    formatAmount,
    parseAmount,
  };
}

export default useToken;
