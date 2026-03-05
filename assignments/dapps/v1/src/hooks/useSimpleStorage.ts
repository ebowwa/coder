/**
 * useSimpleStorage Hook
 * Interact with SimpleStorage contract
 */

import { useCallback, useEffect, useState } from 'react';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import { useContractRead, useContractWrite } from './useContract.ts';
import { ABIS, getContractAddress } from '../config/contracts.ts';
import type { TransactionReceipt, ContractEventLog } from '../types/web3.ts';

// SimpleStorage value changed event args
export interface ValueChangedEventArgs {
  oldValue: bigint;
  newValue: bigint;
  changedBy: string;
}

export interface UseSimpleStorageReturn {
  // Read state
  value: bigint | undefined;
  isLoadingValue: boolean;
  valueError: Error | null;

  // Write state
  setValue: (newValue: bigint) => Promise<string | null>;
  setValueAsync: (newValue: bigint) => Promise<string>;
  isSettingValue: boolean;
  setValueStatus: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  setValueError: Error | null;
  setValueHash: string | null;
  setValueReceipt: TransactionReceipt | null;

  // Events
  lastEvent: ContractEventLog<ValueChangedEventArgs> | null;

  // Utilities
  refetchValue: () => Promise<void>;
  resetWrite: () => void;
  isContractDeployed: boolean;
}

export function useSimpleStorage(): UseSimpleStorageReturn {
  const { chainId, isConnected, provider } = useWeb3();

  // Get contract address for current chain
  const contractAddress = chainId ? getContractAddress(chainId, 'simpleStorage') : null;
  const isContractDeployed = !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  // Read value
  const {
    data: value,
    isLoading: isLoadingValue,
    isError,
    error: valueError,
    refetch: refetchValue,
  } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.simpleStorage,
    functionName: 'getValue',
    options: {
      enabled: isContractDeployed && isConnected,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // 10 seconds
    },
  });

  // Write value
  const {
    write,
    writeAsync,
    hash: setValueHash,
    status: setValueStatus,
    isLoading: isSettingValue,
    isError: isSetError,
    error: setValueError,
    receipt: setValueReceipt,
    reset: resetWrite,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.simpleStorage,
    functionName: 'setValue',
    options: {
      onSuccess: () => {
        // Refetch value after successful write
        refetchValue();
      },
    },
  });

  // Event state (placeholder for future event listening)
  const [_lastEvent, _setLastEvent] = useState<ContractEventLog<ValueChangedEventArgs> | null>(null);
  const lastEvent = _lastEvent; // Expose as read-only

  // Set value wrapper
  const setValue = useCallback(async (newValue: bigint): Promise<string | null> => {
    if (!isContractDeployed) {
      throw new Error('SimpleStorage not deployed on this network');
    }
    return write(newValue);
  }, [isContractDeployed, write]);

  const setValueAsync = useCallback(async (newValue: bigint): Promise<string> => {
    if (!isContractDeployed) {
      throw new Error('SimpleStorage not deployed on this network');
    }
    return writeAsync(newValue);
  }, [isContractDeployed, writeAsync]);

  // Listen for ValueChanged events
  useEffect(() => {
    if (!isContractDeployed || !provider || !isConnected) return;

    // Event handler for ValueChanged events
    // Note: Event listening would require contract instance with provider
    // This is a placeholder for future implementation
    const handleEvent = (
      oldValue: bigint,
      newValue: bigint,
      changedBy: string,
      event: { log: { blockNumber: number; transactionHash: string; logIndex: number } }
    ) => {
      _setLastEvent({
        eventName: 'ValueChanged',
        args: { oldValue, newValue, changedBy },
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
        logIndex: event.log.logIndex,
      });
      void oldValue; void newValue; void changedBy; void event;
    };

    // Mark as intentionally unused for now (placeholder)
    void handleEvent;

    return () => {
      // Cleanup listeners
    };
  }, [isContractDeployed, provider, isConnected, refetchValue]);

  return {
    // Read state
    value,
    isLoadingValue,
    valueError: isError ? valueError : null,

    // Write state
    setValue,
    setValueAsync,
    isSettingValue,
    setValueStatus,
    setValueError: isSetError ? setValueError : null,
    setValueHash,
    setValueReceipt,

    // Events
    lastEvent,

    // Utilities
    refetchValue,
    resetWrite,
    isContractDeployed,
  };
}

export default useSimpleStorage;
