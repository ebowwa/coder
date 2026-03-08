/**
 * Web3 Integration
 * Main entry point for Web3 functionality
 *
 * @example
 * ```tsx
 * import { Web3Provider, useAccount, useConnect } from './web3';
 *
 * function App() {
 *   return (
 *     <Web3Provider>
 *       <WalletSection />
 *     </Web3Provider>
 *   );
 * }
 *
 * function WalletSection() {
 *   const { address, isConnected, chainName } = useAccount();
 *   const { connect, disconnect, toggle } = useConnect();
 *
 *   return (
 *     <div>
 *       {isConnected ? (
 *         <>
 *           <p>Connected: {address}</p>
 *           <p>Network: {chainName}</p>
 *           <button onClick={disconnect}>Disconnect</button>
 *         </>
 *       ) : (
 *         <button onClick={connect}>Connect Wallet</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Providers
export { Web3Provider, useWeb3 } from '../providers/Web3Provider.tsx';
export type { Web3ContextState, Web3ProviderProps } from '../providers/Web3Provider.tsx';

// Hooks
export { useAccount } from '../hooks/useAccount.ts';
export type { UseAccountReturn } from '../hooks/useAccount.ts';

export { useConnect } from '../hooks/useConnect.ts';
export type { UseConnectReturn } from '../hooks/useConnect.ts';

export {
  useContract,
  useContractRead,
  useContractWrite,
} from '../hooks/useContract.ts';
export type {
  UseContractOptions,
  UseContractReturn,
  UseContractReadArgs,
  UseContractWriteArgs,
} from '../hooks/useContract.ts';

export { useSimpleStorage } from '../hooks/useSimpleStorage.ts';
export type { UseSimpleStorageReturn, ValueChangedEventArgs } from '../hooks/useSimpleStorage.ts';

export { useToken } from '../hooks/useToken.ts';
export type { UseTokenReturn, UseTokenOptions } from '../hooks/useToken.ts';

export { useNFT } from '../hooks/useNFT.ts';
export type { UseNFTReturn, UseNFTOptions } from '../hooks/useNFT.ts';

// Config
export {
  CHAINS,
  DEFAULT_CHAIN_ID,
  SUPPORTED_CHAIN_IDS,
  TESTNET_CHAIN_IDS,
  MAINNET_CHAIN_IDS,
  getChain,
  isSupportedChain,
  isTestnet,
  isMainnet,
  getChainName,
  getChainSymbol,
  getBlockExplorer,
  getBlockExplorerAddressUrl,
  getBlockExplorerTxUrl,
  getSwitchChainParams,
} from '../config/chains.ts';

export {
  CONTRACT_ADDRESSES,
  ABIS,
  getContractAddress,
  getContractConfig,
  isContractDeployed,
  getDeployedContracts,
} from '../config/contracts.ts';

// Types
export type {
  ChainConfig,
  ConnectionStatus,
  AccountState,
  ProviderState,
  TransactionStatus,
  TransactionState,
  TransactionReceipt,
  ContractConfig,
  ContractState,
  UseContractReadOptions,
  UseContractWriteOptions,
  ContractReadResult,
  ContractWriteResult,
  EventFilterOptions,
  ContractEventLog,
  TokenInfo,
  TokenBalance,
  NFTInfo,
  NFTMetadata,
  NFTOwnership,
  SimpleStorageState,
  WalletEventType,
  WalletEvent,
  WalletErrorCode,
  Eip1193Provider,
  WalletStatus,
} from '../types/web3.ts';

export { WalletError } from '../types/web3.ts';

// Utilities
export {
  isValidAddress,
  normalizeAddress,
  isZeroAddress,
  shortenAddress,
  shortenTxHash,
  formatBalance,
  parseBalance,
  ethToWei,
  weiToEth,
  gweiToWei,
  weiToGwei,
  toTransactionReceipt,
  parseWalletError,
  isMetaMaskInstalled,
  waitForTransaction,
  getTransactionStatus,
  hashMessage,
  sleep,
  retryWithBackoff,
  addressesEqual,
  isAddressInList,
  getProviderAndSigner,
  formatGasPrice,
  estimateGasWithBuffer,
} from '../utils/web3.ts';
