/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenList } from '../../src/components/dashboard/TokenList';
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
    sparkline_in_7d: { price: [44000, 44500, 45000] },
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
    sparkline_in_7d: { price: [3300, 3250, 3200] },
  },
];

vi.mock('../../src/hooks/useMarketData');

describe('TokenList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with animate-pulse class', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: [],
      isLoading: true,
    });

    const { container } = render(<TokenList />);
    
    // Check for loading skeleton
    const loadingElement = container.querySelector('.animate-pulse');
    expect(loadingElement).toBeTruthy();
  });

  it('does not render search input when loading', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: [],
      isLoading: true,
    });

    render(<TokenList />);

    // Search input should not be present during loading
    expect(screen.queryByPlaceholderText('Search tokens...')).toBeNull();
  });

  it('renders token list after loading completes', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      isLoading: false,
    });

    render(<TokenList />);
    
    // Check for search input
    expect(screen.getByPlaceholderText('Search tokens...')).toBeTruthy();
    
    // Check for token symbols (rendered as uppercase)
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText('ETH')).toBeTruthy();
  });

  it('filters tokens by symbol', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      isLoading: false,
    });

    render(<TokenList />);
    
    const searchInput = screen.getByPlaceholderText('Search tokens...');
    
    // Search for 'btc' (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'btc' } });
    
    // Should show Bitcoin, not Ethereum
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.queryByText('ETH')).toBeNull();
  });

  it('filters tokens by name', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      isLoading: false,
    });

    render(<TokenList />);
    
    const searchInput = screen.getByPlaceholderText('Search tokens...');
    
    // Search for 'ethereum' (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'ethereum' } });
    
    // Should show Ethereum, not Bitcoin
    expect(screen.getByText('ETH')).toBeTruthy();
    expect(screen.queryByText('BTC')).toBeNull();
  });

  it('shows all tokens when search is cleared', () => {
    (useMarketDataModule.useMarketData as Mock).mockReturnValue({
      tokens: mockTokens,
      isLoading: false,
    });

    render(<TokenList />);
    
    const searchInput = screen.getByPlaceholderText('Search tokens...');
    
    // Search for something
    fireEvent.change(searchInput, { target: { value: 'btc' } });
    expect(screen.queryByText('ETH')).toBeNull();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All tokens should be visible
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText('ETH')).toBeTruthy();
  });
});
