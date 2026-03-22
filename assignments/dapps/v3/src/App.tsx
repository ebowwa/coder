import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { mainnet } from 'viem/chains';
import { WalletConnect, AccountBalance } from './components/wallet';
import {
  MarketOverview,
  PriceChart,
  PortfolioSummary,
  PortfolioAllocation,
  TransactionHistory,
  TokenListAdvanced,
  YieldMetrics,
  YieldCalculator,
  GasTracker,
  PriceAlerts,
} from './components/dashboard';

const queryClient = new QueryClient();
const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() } });

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-950 text-white">
          {/* Header */}
          <header className="bg-gray-900 border-b border-gray-800 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">DeFi Dashboard v3</h1>
              <WalletConnect />
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto p-4 space-y-6">
            {/* Account Section */}
            <AccountBalance />

            {/* Market Overview - Full Width */}
            <MarketOverview />

            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PortfolioSummary />
              <GasTracker />
              <PriceAlerts />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PriceChart />
              <YieldCalculator />
            </div>

            {/* Portfolio Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PortfolioAllocation />
              <TransactionHistory />
            </div>

            {/* Token Explorer & Yields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TokenListAdvanced />
              <YieldMetrics />
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 border-t border-gray-800 p-4 mt-8">
            <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
              <p>DeFi Dashboard v3 - Built with React, TypeScript, and Web3</p>
              <p className="mt-1">Data from CoinGecko and DeFiLlama</p>
            </div>
          </footer>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
