/**
 * useNFT Hook
 * ERC721 NFT contract interactions
 */

import { useCallback, useState } from 'react';
import { useWeb3 } from '../providers/Web3Provider.tsx';
import { useContractRead, useContractWrite } from './useContract.ts';
import { ABIS, getContractAddress } from '../config/contracts.ts';
import type { NFTMetadata, TransactionReceipt } from '../types/web3.ts';

export interface UseNFTReturn {
  // Collection info
  name: string | undefined;
  symbol: string | undefined;
  totalSupply: bigint | undefined;
  isLoadingInfo: boolean;

  // Balance (NFT count)
  balance: bigint | undefined;
  isLoadingBalance: boolean;

  // Owner of token
  ownerOf: (tokenId: bigint) => Promise<string>;
  isLoadingOwner: boolean;

  // Token URI
  tokenURI: (tokenId: bigint) => Promise<string>;
  isLoadingURI: boolean;

  // Transfer
  transferFrom: (from: string, to: string, tokenId: bigint) => Promise<string | null>;
  transferFromAsync: (from: string, to: string, tokenId: bigint) => Promise<string>;
  isTransferring: boolean;
  transferError: Error | null;
  transferHash: string | null;
  transferReceipt: TransactionReceipt | null;

  // Safe transfer
  safeTransferFrom: (from: string, to: string, tokenId: bigint) => Promise<string | null>;
  safeTransferFromAsync: (from: string, to: string, tokenId: bigint) => Promise<string>;
  isSafeTransferring: boolean;

  // Approve
  approve: (to: string, tokenId: bigint) => Promise<string | null>;
  approveAsync: (to: string, tokenId: bigint) => Promise<string>;
  isApproving: boolean;

  // Approval for all
  setApprovalForAll: (operator: string, approved: boolean) => Promise<string | null>;
  setApprovalForAllAsync: (operator: string, approved: boolean) => Promise<string>;

  // Utilities
  refetchBalance: () => Promise<void>;
  isContractDeployed: boolean;

  // Fetch metadata
  fetchMetadata: (tokenId: bigint) => Promise<NFTMetadata | null>;
}

export interface UseNFTOptions {
  address?: string;
}

export function useNFT(options: UseNFTOptions = {}): UseNFTReturn {
  const { address: customAddress } = options;
  const { chainId, isConnected, address: userAddress, provider } = useWeb3();

  // Get contract address
  const contractAddress = customAddress ?? (chainId ? getContractAddress(chainId, 'nft') : null);
  const isContractDeployed = !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  // Collection info
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

  // Balance (NFT count owned)
  const {
    data: balance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useContractRead<bigint>({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'balanceOf',
    args: [userAddress],
    options: {
      enabled: isContractDeployed && isConnected && !!userAddress,
      refetchInterval: 10000,
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
    functionName: 'transferFrom',
    options: {
      onSuccess: () => {
        refetchBalance();
      },
    },
  });

  // Safe transfer
  const {
    write: safeTransferWrite,
    writeAsync: safeTransferWriteAsync,
    isLoading: isSafeTransferring,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'safeTransferFrom',
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
    isLoading: isApproving,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'approve',
  });

  // Set approval for all
  const {
    write: setApprovalForAllWrite,
    writeAsync: setApprovalForAllWriteAsync,
  } = useContractWrite({
    address: contractAddress ?? '',
    abi: ABIS.erc721,
    functionName: 'setApprovalForAll',
  });

  // State for owner and URI loading
  const [isLoadingOwner, setIsLoadingOwner] = useState(false);
  const [isLoadingURI, setIsLoadingURI] = useState(false);

  // Owner of token
  const ownerOf = useCallback(async (tokenId: bigint): Promise<string> => {
    if (!isContractDeployed || !provider) {
      throw new Error('NFT contract not available');
    }

    setIsLoadingOwner(true);
    try {
      const { Contract } = await import('ethers');
      const contract = new Contract(contractAddress!, ABIS.erc721, provider);
      const fn = contract.getFunction('ownerOf');
      if (!fn) throw new Error('ownerOf not found');
      return await fn(tokenId);
    } finally {
      setIsLoadingOwner(false);
    }
  }, [isContractDeployed, provider, contractAddress]);

  // Token URI
  const tokenURI = useCallback(async (tokenId: bigint): Promise<string> => {
    if (!isContractDeployed || !provider) {
      throw new Error('NFT contract not available');
    }

    setIsLoadingURI(true);
    try {
      const { Contract } = await import('ethers');
      const contract = new Contract(contractAddress!, ABIS.erc721, provider);
      const fn = contract.getFunction('tokenURI');
      if (!fn) throw new Error('tokenURI not found');
      return await fn(tokenId);
    } finally {
      setIsLoadingURI(false);
    }
  }, [isContractDeployed, provider, contractAddress]);

  // Transfer wrapper
  const transferFrom = useCallback(async (
    from: string,
    to: string,
    tokenId: bigint
  ): Promise<string | null> => {
    return transferWrite(from, to, tokenId);
  }, [transferWrite]);

  const transferFromAsync = useCallback(async (
    from: string,
    to: string,
    tokenId: bigint
  ): Promise<string> => {
    return transferWriteAsync(from, to, tokenId);
  }, [transferWriteAsync]);

  // Safe transfer wrapper
  const safeTransferFrom = useCallback(async (
    from: string,
    to: string,
    tokenId: bigint
  ): Promise<string | null> => {
    return safeTransferWrite(from, to, tokenId);
  }, [safeTransferWrite]);

  const safeTransferFromAsync = useCallback(async (
    from: string,
    to: string,
    tokenId: bigint
  ): Promise<string> => {
    return safeTransferWriteAsync(from, to, tokenId);
  }, [safeTransferWriteAsync]);

  // Approve wrapper
  const approve = useCallback(async (to: string, tokenId: bigint): Promise<string | null> => {
    return approveWrite(to, tokenId);
  }, [approveWrite]);

  const approveAsync = useCallback(async (to: string, tokenId: bigint): Promise<string> => {
    return approveWriteAsync(to, tokenId);
  }, [approveWriteAsync]);

  // Set approval for all wrapper
  const setApprovalForAll = useCallback(async (
    operator: string,
    approved: boolean
  ): Promise<string | null> => {
    return setApprovalForAllWrite(operator, approved);
  }, [setApprovalForAllWrite]);

  const setApprovalForAllAsync = useCallback(async (
    operator: string,
    approved: boolean
  ): Promise<string> => {
    return setApprovalForAllWriteAsync(operator, approved);
  }, [setApprovalForAllWriteAsync]);

  // Fetch metadata
  const fetchMetadata = useCallback(async (tokenId: bigint): Promise<NFTMetadata | null> => {
    try {
      const uri = await tokenURI(tokenId);

      // Try to fetch JSON metadata
      let metadata: Partial<NFTMetadata> = { tokenId, uri };

      if (uri.startsWith('http') || uri.startsWith('ipfs://')) {
        // Handle IPFS URIs
        const httpUri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');

        try {
          const response = await fetch(httpUri);
          const json = await response.json();

          metadata = {
            ...metadata,
            name: json.name,
            description: json.description,
            image: json.image,
            attributes: json.attributes,
          };
        } catch {
          // Failed to fetch JSON, return URI only
        }
      }

      return metadata as NFTMetadata;
    } catch {
      return null;
    }
  }, [tokenURI]);

  return {
    // Collection info
    name,
    symbol,
    totalSupply,
    isLoadingInfo: isLoadingName || isLoadingSymbol || isLoadingSupply,

    // Balance
    balance,
    isLoadingBalance,

    // Owner of
    ownerOf,
    isLoadingOwner,

    // Token URI
    tokenURI,
    isLoadingURI,

    // Transfer
    transferFrom,
    transferFromAsync,
    isTransferring,
    transferError: transferError ?? null,
    transferHash,
    transferReceipt,

    // Safe transfer
    safeTransferFrom,
    safeTransferFromAsync,
    isSafeTransferring,

    // Approve
    approve,
    approveAsync,
    isApproving,

    // Approval for all
    setApprovalForAll,
    setApprovalForAllAsync,

    // Utilities
    refetchBalance,
    isContractDeployed,

    // Fetch metadata
    fetchMetadata,
  };
}

export default useNFT;
