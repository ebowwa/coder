import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { mainnet } from 'viem/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { WalletConnect as WalletConnectButton, AccountBalance } from './components/wallet';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LogoWithText } from './components/common/Logo';
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
import { useMarketData } from './hooks/useMarketData';
import { formatNumber } from './utils/format';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'NexusFi Dashboard' }),
  ],
  transports: { [mainnet.id]: http() }
});

// Market Ticker Component
function MarketTicker() {
  const { marketData } = useMarketData(10);
  const [isPaused, setIsPaused] = useState(false);

  const tickerItems = [
    { label: 'Total MCap', value: `$${formatNumber(marketData?.totalMarketCap || 0)}`, change: marketData?.marketCapChangePercentage24h || 0 },
    { label: '24h Volume', value: `$${formatNumber(marketData?.totalVolume || 0)}`, change: 0 },
    { label: 'BTC Dominance', value: `${marketData?.btcDominance?.toFixed(1) || 52.3}%`, change: 0.2 },
    { label: 'ETH Gas', value: '23 Gwei', change: -5 },
    { label: 'Fear & Greed', value: '72', change: 3, isIndex: true },
  ];

  return (
    <div
      className="bg-slate-900/50 border-b border-gray-800/30 py-2 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={`flex gap-8 animate-ticker ${isPaused ? 'animation-paused' : ''}`}>
        {[...tickerItems, ...tickerItems].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-400 text-sm font-medium">{item.label}:</span>
            <span className="text-white text-sm font-semibold number-mono">{item.value}</span>
            {item.change !== 0 && (
              <span className={`text-xs font-semibold ${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </span>
            )}
            <span className="text-gray-700 mx-2">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Volume Card Component
function VolumeCard() {
  const { marketData } = useMarketData(10);
  const volume = marketData?.totalVolume || 2400000000;
  const change = 12.5;

  return (
    <div className="card hover-lift card-shine relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <span className="metric-label">24h Volume</span>
      </div>
      <div className="metric-value number-mono animate-count-up">${formatNumber(volume)}</div>
      <div className="metric-change positive mt-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-green-500/15 border border-green-500/30 text-green-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          +{change.toFixed(1)}%
        </span>
        <span className="text-gray-400 ml-2 text-sm font-medium">vs yesterday</span>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
        <span className="text-xs text-gray-500">Global trading volume</span>
      </div>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#0f172a]">
          {/* Market Ticker */}
          <MarketTicker />

          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-gray-800/50 backdrop-blur-xl bg-[#030712]/80">
            <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <LogoWithText />
                <nav className="hidden md:flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-gray-800/30">
                  {['Dashboard', 'Portfolio', 'Trade', 'Earn'].map((item) => (
                    <button
                      key={item}
                      onClick={() => setActiveNav(item.toLowerCase())}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        activeNav === item.toLowerCase()
                          ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25'
                          : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-3">
                {/* Search Button */}
                <button className="btn btn-ghost relative p-2.5 rounded-xl hover:bg-slate-800/50 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Notification Button */}
                <button className="btn btn-ghost relative p-2.5 rounded-xl hover:bg-slate-800/50 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 12.75h3.75l-1.054-1.054A1.524 1.524 0 0113.5 10.618V8.25a4.5 4.5 0 00-3-4.244V3.75a1.5 1.5 0 00-3 0v.256A4.5 4.5 0 004.5 8.25v2.368c0 .404-.16.791-.446 1.078L3 12.75h3.75m4.5 0v.75a2.25 2.25 0 01-4.5 0v-.75m4.5 0H6.75" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full glow-pulse" />
                </button>

                {/* Settings Button */}
                <button className="btn btn-ghost relative p-2.5 rounded-xl hover:bg-slate-800/50 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* User Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold cursor-pointer shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all ring-2 ring-white/10">
                  N
                </div>

                {/* Wallet Connect */}
                <WalletConnectButton />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-[1600px] mx-auto p-6 space-y-6">
            {/* Account Balance Row */}
            <ErrorBoundary>
              <AccountBalance />
            </ErrorBoundary>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ErrorBoundary>
                <PortfolioSummary />
              </ErrorBoundary>
              <ErrorBoundary>
                <GasTracker />
              </ErrorBoundary>
              <ErrorBoundary>
                <PriceAlerts />
              </ErrorBoundary>
              <ErrorBoundary>
                <VolumeCard />
              </ErrorBoundary>
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <PriceChart />
              </ErrorBoundary>
              <ErrorBoundary>
                <YieldCalculator />
              </ErrorBoundary>
            </div>

            {/* Portfolio Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <PortfolioAllocation />
              </ErrorBoundary>
              <ErrorBoundary>
                <TransactionHistory />
              </ErrorBoundary>
            </div>

            {/* Market Overview - Full Width */}
            <ErrorBoundary>
              <MarketOverview />
            </ErrorBoundary>

            {/* Token Explorer & Yields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <TokenListAdvanced />
              </ErrorBoundary>
              <ErrorBoundary>
                <YieldMetrics />
              </ErrorBoundary>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-800/30 mt-12 bg-gradient-to-t from-slate-900/80 to-transparent">
            <div className="max-w-[1600px] mx-auto px-6 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                  <LogoWithText className="opacity-70" />
                  <span className="text-sm text-gray-500">Professional DeFi Analytics</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Docs
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    API
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </a>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="mt-8 pt-6 border-t border-gray-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>© 2026 NexusFi Protocol</span>
                  <span>•</span>
                  <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
                  <span>•</span>
                  <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-400 glow-pulse" />
                    <span className="text-xs text-green-400 font-semibold">All Systems Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
