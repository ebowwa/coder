/**
 * SimpleStorage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleStorage } from '../../src/components/SimpleStorage';
import * as useWeb3Module from '../../src/hooks/useWeb3';
import * as useSimpleStorageModule from '../../src/hooks/useSimpleStorage';

// Mock hooks
vi.mock('../../src/hooks/useWeb3');
vi.mock('../../src/hooks/useSimpleStorage');

describe('SimpleStorage Component', () => {
  const mockUseWeb3 = {
    chainId: 31337,
    isConnected: true,
    provider: {},
    account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchChain: vi.fn(),
  };

  const mockUseSimpleStorage = {
    value: 0n,
    isLoadingValue: false,
    valueError: null,
    setValue: vi.fn(),
    setValueAsync: vi.fn(),
    isSettingValue: false,
    setValueStatus: 'idle' as const,
    setValueError: null,
    setValueHash: null,
    setValueReceipt: null,
    lastEvent: null,
    refetchValue: vi.fn(),
    resetWrite: vi.fn(),
    isContractDeployed: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWeb3Module.useWeb3).mockReturnValue(mockUseWeb3);
    vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue(mockUseSimpleStorage);
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<SimpleStorage />);
      expect(screen.getByTestId('simple-storage')).toBeInTheDocument();
    });

    it('should display header', () => {
      render(<SimpleStorage />);
      expect(screen.getByRole('heading', { name: /simple storage/i })).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<SimpleStorage />);
      expect(screen.getByText(/0/i)).toBeInTheDocument();
    });

    it('should display custom value', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        value: 123n,
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/123/i)).toBeInTheDocument();
    });

    it('should display loading state', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        isLoadingValue: true,
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display error state', () => {
      const error = new Error('Test error');
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        valueError: error,
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });
  });

  describe('Value Input', () => {
    it('should allow input', () => {
      render(<SimpleStorage />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });

    it('should update input value', () => {
      render(<SimpleStorage />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '42' } });
      expect(input).toHaveValue(42);
    });

    it('should handle empty input', () => {
      render(<SimpleStorage />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);
    });
  });

  describe('Set Value Button', () => {
    it('should render set value button', () => {
      render(<SimpleStorage />);
      expect(screen.getByRole('button', { name: /set value/i })).toBeInTheDocument();
    });

    it('should be disabled when disconnected', () => {
      vi.mocked(useWeb3Module.useWeb3).mockReturnValue({
        ...mockUseWeb3,
        isConnected: false,
      });
      render(<SimpleStorage />);
      expect(screen.getByRole('button', { name: /set value/i })).toBeDisabled();
    });

    it('should be disabled when loading', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        isSettingValue: true,
      });
      render(<SimpleStorage />);
      expect(screen.getByRole('button', { name: /set value/i })).toBeDisabled();
    });

    it('should call setValue when clicked', async () => {
      const setValueMock = vi.fn().mockResolvedValue('0x123');
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        setValue: setValueMock,
      });

      render(<SimpleStorage />);
      const input = screen.getByRole('spinbutton');
      const button = screen.getByRole('button', { name: /set value/i });

      fireEvent.change(input, { target: { value: '42' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(setValueMock).toHaveBeenCalledWith(42n);
      });
    });
  });

  describe('Refresh Button', () => {
    it('should render refresh button', () => {
      render(<SimpleStorage />);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should call refetchValue when clicked', () => {
      const refetchMock = vi.fn();
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        refetchValue: refetchMock,
      });

      render(<SimpleStorage />);
      const button = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(button);

      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe('Status Messages', () => {
    it('should show pending status', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        setValueStatus: 'pending',
        setValueHash: '0x123',
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/transaction pending/i)).toBeInTheDocument();
    });

    it('should show confirming status', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        setValueStatus: 'confirming',
        setValueHash: '0x123',
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/confirming/i)).toBeInTheDocument();
    });

    it('should show success status', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        setValueStatus: 'success',
        setValueHash: '0x123',
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/transaction successful/i)).toBeInTheDocument();
    });

    it('should show error status', () => {
      const error = new Error('Transaction failed');
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        setValueStatus: 'error',
        setValueError: error,
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
    });
  });

  describe('Not Deployed State', () => {
    it('should show not deployed message', () => {
      vi.mocked(useSimpleStorageModule.useSimpleStorage).mockReturnValue({
        ...mockUseSimpleStorage,
        isContractDeployed: false,
      });
      render(<SimpleStorage />);
      expect(screen.getByText(/not deployed/i)).toBeInTheDocument();
    });
  });
});
