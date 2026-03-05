/**
 * Contract Addresses and ABIs by Chain
 * Configure deployed contract addresses per network
 */

import type { ContractConfig } from '../types/web3.ts';

// Contract addresses by chain ID
export interface ContractAddresses {
  simpleStorage?: string;
  token?: string;
  nft?: string;
}

// Addresses per chain
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Ethereum Mainnet
  1: {
    // Add mainnet addresses when deployed
  },

  // Sepolia Testnet
  11155111: {
    simpleStorage: '0x0000000000000000000000000000000000000000', // Replace with deployed address
    token: '0x0000000000000000000000000000000000000000',
    nft: '0x0000000000000000000000000000000000000000',
  },

  // Localhost (for local development)
  31337: {
    simpleStorage: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Hardhat deployment
    token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    nft: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  },

  // Goerli Testnet
  5: {
    simpleStorage: '0x0000000000000000000000000000000000000000',
  },
};

// Contract ABIs
export const ABIS = {
  // SimpleStorage ABI
  simpleStorage: [
    // Read
    'function getValue() view returns (uint256)',
    'function value() view returns (uint256)',

    // Write
    'function setValue(uint256 _value)',

    // Events
    'event ValueChanged(uint256 oldValue, uint256 newValue, address indexed changedBy)',
  ] as const,

  // ERC20 Token ABI
  erc20: [
    // Read
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',

    // Write
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function mint(address to, uint256 amount)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event Mint(address indexed to, uint256 value)',
  ] as const,

  // ERC721 NFT ABI
  erc721: [
    // Read
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function getApproved(uint256 tokenId) view returns (address)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',

    // Write
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function approve(address to, uint256 tokenId)',
    'function setApprovalForAll(address operator, bool approved)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
    'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  ] as const,

  // ERC1155 Multi-Token ABI
  erc1155: [
    // Read
    'function balanceOf(address account, uint256 id) view returns (uint256)',
    'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
    'function isApprovedForAll(address account, address operator) view returns (bool)',
    'function uri(uint256 id) view returns (string)',

    // Write
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
    'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
    'function setApprovalForAll(address operator, bool approved)',

    // Events
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
    'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
    'event ApprovalForAll(address indexed account, address indexed operator, bool approved)',
    'event URI(string value, uint256 indexed id)',
  ] as const,
} as const;

// Get contract address for a chain
export function getContractAddress(
  chainId: number,
  contractName: keyof ContractAddresses
): string | undefined {
  return CONTRACT_ADDRESSES[chainId]?.[contractName];
}

// Get contract configuration
export function getContractConfig(
  chainId: number,
  contractName: keyof ContractAddresses,
  abi: readonly unknown[]
): ContractConfig | null {
  const address = getContractAddress(chainId, contractName);
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  return {
    address,
    abi: [...abi],
    chainId,
  };
}

// Check if contract is deployed on chain
export function isContractDeployed(
  chainId: number,
  contractName: keyof ContractAddresses
): boolean {
  const address = getContractAddress(chainId, contractName);
  return !!address && address !== '0x0000000000000000000000000000000000000000';
}

// Get all deployed contracts for a chain
export function getDeployedContracts(chainId: number): ContractAddresses {
  return CONTRACT_ADDRESSES[chainId] ?? {};
}
