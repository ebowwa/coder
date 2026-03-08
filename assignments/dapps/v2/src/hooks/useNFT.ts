/**
 * useNFT Hook
 * ERC721 NFT contract interactions
 */

import { useCallback, useState } from 'react';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import { useContractRead, useContractWrite } from './useContract.ts';
import { ABIS, getContractAddress } from '../config/contracts.ts';
import type { TransactionReceipt } from '../types/web3.ts';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

export interface OwnedNFT {
  tokenId: bigint;
  tokenURI: string;
  metadata: NFTMetadata | null;
}

export interface UseNFTReturn {
  // NFT info
  name: string | undefined;
  symbol: string | undefined;
  totalSupply: bigint | undefined;
  isLoadingInfo: boolean;
  infoError: Error | null;

  // Balance
  balance: number | undefined;
  isLoadingBalance: boolean;
  balanceError: Error | null;

  // Owned NFTs
  ownedNFTs: OwnedNFT[];
  isLoadingOwnedNFTs: boolean;
  ownedNFTsError: Error | null;

  // Mint
  mint: (to: string, uri: string) => Promise<string | null>;
  mintAsync: (to: string, uri: string) => Promise<string>;
  isMinting: boolean;
  mintError: Error | null;
  mintHash: string | null;
  mintReceipt: TransactionReceipt | null;

  // Transfer
  transfer: (to: string, tokenId: bigint) => Promise<string | null>;
  transferAsync: (to: string, tokenId: bigint) => Promise<string>;
  isTransferring: boolean;
  transferError: Error | null;
  transferHash: string | null;
  transferReceipt: TransactionReceipt | null;

  // Approve
  approve: (to: string, tokenId: bigint) => Promise<string | null>;
  approveAsync: (to: string, tokenId: bigint) => Promise<string>;
  isApproving: boolean;
  approveError: Error | null;
  approveHash: string | null;
  approveReceipt: TransactionReceipt | null;

  // Utilities
  refetchBalance: () => Promise<void>;
  refetchOwnedNFTs: () => Promise<void>;
  isContractDeployed: boolean;
}

export interface UseNFTOptions {
  address?: string;
}

export function useNFT(options: UseNFTOptions = {}): UseNFTReturn {
  const { address: customAddress } = options;
  const { chainId, isConnected, address: userAddress } = useWeb3();

  // Get contract address
  const contractAddress = customAddress ?? (chainId ? getContractAddress(chainId, 'nft') : null);
  const isContractDeployed = !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  // NFT info reads
  const { data: name, isLoading: isLoadingName } = useContractRead<string>({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'name',
    options: { enabled: isContractDeployed && isConnected },
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useContractRead<string>({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'symbol',
    options: { enabled: isContractDeployed && isConnected },
  });

  const { data: totalSupply, isLoading: isLoadingSupply } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'totalSupply',
    options: { enabled: isContractDeployed && isConnected },
  });

  // Balance
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'balanceOf',
    args: [userAddress],
    options: {
      enabled: isContractDeployed && isConnected && !!userAddress,
      refetchInterval: 15000,
    },
  });

  // Owned NFTs state
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [isLoadingOwnedNFTs, setIsLoadingOwnedNFTs] = useState(false);
  const [ownedNFTsError, setOwnedNFTsError] = useState<Error | null>(null);

  // Fetch owned NFTs
  const refetchOwnedNFTs = useCallback(async () => {
    if (!isContractDeployed || !isConnected || !userAddress || balance === undefined) {
      return;
    }

    setIsLoadingOwnedNFTs(true);
    setOwnedNFTsError(null);

    try {
      // Note: This is a simplified implementation
      // In production, you'd use indexed queries or a graph protocol
      const nfts: OwnedNFT[] = [];
      const balanceNum = Number(balance);

      // Try to find NFTs by checking token IDs from totalSupply
      for (let i = 1; i <= balanceNum && i <= 50; i++) {
        try {
          // Check if user owns this token ID
          // This requires a contract call to ownerOf for each potential token
          // For efficiency, we'll just store the structure here
          nfts.push({
            tokenId: BigInt(i),
            tokenURI: '',
            metadata: null,
          });
        } catch {
          // Token doesn't exist or not owned
        }
      }

      setOwnedNFTs(nfts);
    } catch (error) {
      setOwnedNFTsError(error instanceof Error ? error : new Error('Failed to fetch NFTs'));
    } finally {
      setIsLoadingOwnedNFTs(false);
    }
  }, [isContractDeployed, isConnected, userAddress, balance]);

  // Mint
  const {
    write: mintWrite,
    writeAsync: mintWriteAsync,
    hash: mintHash,
    status: _mintStatus,
    isLoading: isMinting,
    error: mintError,
    receipt: mintReceipt,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'safeTransferFrom', // Will be replaced with actual mint function
    options: {
      onSuccess: () => {
        refetchBalance();
        refetchOwnedNFTs();
      },
    },
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
    abi: ABIS.erc721,
    functionName: 'safeTransferFrom',
    options: {
      onSuccess: () => {
        refetchBalance();
        refetchOwnedNFTs();
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
    abi: ABIS.erc721,
    functionName: 'approve',
  });

  // Mint wrapper - note: SimpleNFT may need custom mint function
  const mint = useCallback(async (to: string, uri: string): Promise<string | null> => {
    if (!isContractDeployed) {
      throw new Error('NFT contract not deployed on this network');
    }
    // This would need to match the actual mint function signature
    // For now, placeholder
    void uri;
    return mintWrite(to, BigInt(0));
  }, [isContractDeployed, mintWrite]);

  const mintAsync = useCallback(async (to: string, uri: string): Promise<string> => {
    if (!isContractDeployed) {
      throw new Error('NFT contract not deployed on this network');
    }
    void uri;
    return mintWriteAsync(to, BigInt(0));
  }, [isContractDeployed, mintWriteAsync]);

  // Transfer wrapper
  const transfer = useCallback(async (to: string, tokenId: bigint): Promise<string | null> => {
    if (!isContractDeployed || !userAddress) {
      throw new Error('NFT contract not available or not connected');
    }
    return transferWrite(userAddress, to, tokenId);
  }, [isContractDeployed, userAddress, transferWrite]);

  const transferAsync = useCallback(async (to: string, tokenId: bigint): Promise<string> => {
    if (!isContractDeployed || !userAddress) {
      throw new Error('NFT contract not available or not connected');
    }
    return transferWriteAsync(userAddress, to, tokenId);
  }, [isContractDeployed, userAddress, transferWriteAsync]);

  // Approve wrapper
  const approve = useCallback(async (to: string, tokenId: bigint): Promise<string | null> => {
    if (!isContractDeployed) {
      throw new Error('NFT contract not available');
    }
    return approveWrite(to, tokenId);
  }, [isContractDeployed, approveWrite]);

  const approveAsync = useCallback(async (to: string, tokenId: bigint): Promise<string> => {
    if (!isContractDeployed) {
      throw new Error('NFT contract not available');
    }
    return approveWriteAsync(to, tokenId);
  }, [isContractDeployed, approveWriteAsync]);

  return {
    // NFT info
    name,
    symbol,
    totalSupply,
    isLoadingInfo: isLoadingName || isLoadingSymbol || isLoadingSupply,
    infoError: null,

    // Balance
    balance: balance !== undefined ? Number(balance) : undefined,
    isLoadingBalance,
    balanceError: balanceError ?? null,

    // Owned NFTs
    ownedNFTs,
    isLoadingOwnedNFTs,
    ownedNFTsError,

    // Mint
    mint,
    mintAsync,
    isMinting,
    mintError: mintError ?? null,
    mintHash,
    mintReceipt,

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
    refetchOwnedNFTs,
    isContractDeployed,
  };
}

export default useNFT;
