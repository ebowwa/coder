/**
 * Blockchain Network Configurations
 * Supported chains for the dapp
 */

import type { ChainConfig } from '../types/web3.ts';

export const CHAINS: Record<number, ChainConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://eth.drpc.org',
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/ethereum.png'],
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc.ankr.com/eth_sepolia',
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/ethereum.png'],
  },

  // Localhost (Hardhat/Anvil)
  31337: {
    chainId: 31337,
    chainName: 'Localhost',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
    iconUrls: [],
  },

  // Goerli Testnet (deprecated but still used)
  5: {
    chainId: 5,
    chainName: 'Goerli Testnet',
    nativeCurrency: {
      name: 'Goerli Ether',
      symbol: 'GOR',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.goerli.mudit.blog/',
      'https://ethereum-goerli.publicnode.com',
    ],
    blockExplorerUrls: ['https://goerli.etherscan.io'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/ethereum.png'],
  },

  // Polygon Mainnet
  137: {
    chainId: 137,
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/matic.png'],
  },

  // Arbitrum One
  42161: {
    chainId: 42161,
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/arbitrum.png'],
  },

  // Optimism
  10: {
    chainId: 10,
    chainName: 'Optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/optimism.png'],
  },

  // Base
  8453: {
    chainId: 8453,
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://mainnet.base.org',
      'https://rpc.ankr.com/base',
    ],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrls: ['https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/base.png'],
  },
};

// Default chain (Sepolia for development)
export const DEFAULT_CHAIN_ID = 11155111;

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);

// Testnet chain IDs
export const TESTNET_CHAIN_IDS = [11155111, 5, 31337];

// Mainnet chain IDs
export const MAINNET_CHAIN_IDS = [1, 137, 42161, 10, 8453];

// Helper functions
export function getChain(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAINS;
}

export function isTestnet(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.includes(chainId);
}

export function isMainnet(chainId: number): boolean {
  return MAINNET_CHAIN_IDS.includes(chainId);
}

export function getChainName(chainId: number): string {
  return CHAINS[chainId]?.chainName ?? `Chain ${chainId}`;
}

export function getChainSymbol(chainId: number): string {
  return CHAINS[chainId]?.nativeCurrency.symbol ?? 'ETH';
}

export function getBlockExplorer(chainId: number): string | undefined {
  return CHAINS[chainId]?.blockExplorerUrls?.[0];
}

export function getBlockExplorerAddressUrl(chainId: number, address: string): string | undefined {
  const explorer = getBlockExplorer(chainId);
  return explorer ? `${explorer}/address/${address}` : undefined;
}

export function getBlockExplorerTxUrl(chainId: number, txHash: string): string | undefined {
  const explorer = getBlockExplorer(chainId);
  return explorer ? `${explorer}/tx/${txHash}` : undefined;
}

// Network switching parameters for MetaMask
export function getSwitchChainParams(chainId: number): { chainId: string } | {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: readonly string[];
  blockExplorerUrls?: readonly string[];
} {
  const chain = CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: chain.chainName,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
    blockExplorerUrls: chain.blockExplorerUrls,
  };
}
