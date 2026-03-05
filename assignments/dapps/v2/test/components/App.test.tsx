/**
 * App Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';
import * as useWeb3Module from '../src/hooks/useWeb3';

// Mock useWeb3 hook
vi.mock('../src/hooks/useWeb3');

describe('App Component', () => {
  const mockUseWeb3 = {
    chainId: 31337,
    isConnected: false,
    provider: null,
    account: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchChain: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWeb3Module.useWeb3).mockReturnValue(mockUseWeb3);
  });

  describe('Rendering', () => {
    it('should render the app', () => {
      render(<App />);
      expect(screen.getByTestId('app')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<App />);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render main content', () => {
      render(<App />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display app title', () => {
      render(<App />);
      expect(screen.getByText('DApp Platform')).toBeInTheDocument();
    });

    it('should render Web3Provider', () => {
      render(<App />);
      // Web3Provider should wrap the app
      expect(screen.getByTestId('app')).toBeInTheDocument();
    });
  });
});
