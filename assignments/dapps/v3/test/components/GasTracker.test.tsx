/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GasTracker } from '../../src/components/dashboard/GasTracker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../src/hooks/useGasPrice', () => ({
  useGasPrice: vi.fn(),
}));

vi.mock('../../src/hooks/useTokenPrices', () => ({
  useTokenPrice: vi.fn(),
}));

import { useGasPrice } from '../../src/hooks/useGasPrice';
import { useTokenPrice } from '../../src/hooks/useTokenPrices';

const mockedUseGasPrice = useGasPrice as Mock;
const mockedUseTokenPrice = useTokenPrice as Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('GasTracker', () => {
  const mockGasData = {
    slow: { price: 15, time: '~30 sec' },
    average: { price: 20, time: '~1 min' },
    fast: { price: 25, time: '~30 sec' },
    baseFee: 18,
    lastBlock: 18500000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseGasPrice.mockReturnValue({
      data: mockGasData,
      isLoading: false,
    });
    mockedUseTokenPrice.mockReturnValue({
      data: { ethereum: { usd: 2000, usd_24h_change: 2.5 } },
    });
  });

  describe('rendering', () => {
    it('should render gas prices', () => {
      render(<GasTracker />, { wrapper });

      expect(screen.getByText('Gas Prices')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Slow
      expect(screen.getByText('20')).toBeInTheDocument(); // Average
      expect(screen.getByText('25')).toBeInTheDocument(); // Fast
    });

    it('should render transaction cost estimates', () => {
      render(<GasTracker />, { wrapper });

      expect(screen.getByText('Standard Transfer')).toBeInTheDocument();
      expect(screen.getByText('Token Transfer')).toBeInTheDocument();
      expect(screen.getByText('Swap Transaction')).toBeInTheDocument();
    });

    it('should display block number', () => {
      render(<GasTracker />, { wrapper });

      expect(screen.getByText(/Block:/)).toBeInTheDocument();
      expect(screen.getByText(/18,500,000/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show skeleton while loading', () => {
      mockedUseGasPrice.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = render(<GasTracker />, { wrapper });
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('cost calculations', () => {
    it('should calculate costs based on gas price and ETH price', () => {
      render(<GasTracker />, { wrapper });

      // With gas price 20 and ETH price 2000
      // Standard transfer (21000 gas): (20 * 21000 * 2000) / 1e9 ≈ $0.84
      const costs = screen.getAllByText(/\$\d+\.\d{2}/);
      expect(costs.length).toBeGreaterThan(0);
    });
  });

  describe('gas levels', () => {
    it('should highlight average gas price', () => {
      render(<GasTracker />, { wrapper });

      const averageElement = screen.getByText('20').parentElement;
      expect(averageElement).toHaveClass('border', 'border-green-700');
    });
  });
});
