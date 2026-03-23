/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarketOverview } from '../../src/components/dashboard/MarketOverview';
import * as useMarketDataModule from '../../src/hooks/useMarketData';

const mockTokens = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://example.com/btc.png',
    current_price: 45000,
    price_change_percentage_24h: 2.5,
    market_cap: 850000000000,
    total_volume: 25000000000,
    sparkline_in_7d: { price: [44000, 44500, 45000, 45500, 46000, 45500, 45000] },
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://example.com/eth.png',
    current_price: 3200,
    price_change_percentage_24h: -1.2,
    market_cap: 385000000000,
    total_volume: 18000000000,
    sparkline_in_7d: { price: [3300, 3250, 3200, 3150, 3200, 3225, 3200] },
  },
];

const mockMarketData = {
  totalMarketCap: 1235000000000,
  totalVolume: 43000000000,
  btcDominance: 43.2,
  marketCapChangePercentage24h: 1.5,
};

vi.mock('../../src/hooks/useMarketData', () => ({
  useMarketData: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('MarketOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when data is loading', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: [],
      marketData: undefined,
      isLoading: true,
    });

    const { container } = render(<MarketOverview />, { wrapper: createWrapper() });
    
    // Check for loading skeleton (skeleton class)
    expect(container.querySelector('.skeleton')).toBeTruthy();
  });

  it('renders market data successfully', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      marketData: mockMarketData,
      isLoading: false,
    });

    render(<MarketOverview />, { wrapper: createWrapper() });

    expect(screen.getByText(/Market Overview/i)).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('displays token prices correctly', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      marketData: mockMarketData,
      isLoading: false,
    });

    render(<MarketOverview />, { wrapper: createWrapper() });

    expect(screen.getByText(/45,000/)).toBeTruthy();
  });

  it('handles empty tokens array gracefully', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: [],
      marketData: mockMarketData,
      isLoading: false,
    });

    render(<MarketOverview />, { wrapper: createWrapper() });

    expect(screen.getByText(/Market Overview/i)).toBeInTheDocument();
  });
});
