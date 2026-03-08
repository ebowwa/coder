/**
 * wagmi Configuration
 * Sets up the wagmi client with network configurations
 */

import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, polygon, optimism, arbitrum } from 'wagmi/chains';

// Define chains to support
export const chains = [
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
] as const;

// Create wagmi config
export const config = createConfig({
  chains,
  connectors: [
    // Injected connector (MetaMask, Coinbase Wallet, etc.)
    // Will be configured by wagmi's default injected connector
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: false, // Client-side only
});
