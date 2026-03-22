import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig, createConfig, mainnet } from 'wagmi';
import { http } from 'viem';
import { WalletConnect, AccountBalance } from './components/wallet';
import { MarketOverview, PriceChart, PortfolioSummary, TokenList, YieldMetrics } from './components/dashboard';

const queryClient = new QueryClient();
const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() } });

export default function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-950 text-white p-4">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">DeFi Dashboard v3</h1>
            <WalletConnect />
          </header>
          <AccountBalance />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <MarketOverview />
            <PriceChart />
            <PortfolioSummary />
            <TokenList />
            <YieldMetrics />
          </div>
        </div>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
