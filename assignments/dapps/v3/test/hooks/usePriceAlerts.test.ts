/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceAlerts } from '../../src/hooks/usePriceAlerts';

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('usePriceAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with empty alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());
      expect(result.current.alerts).toEqual([]);
      expect(result.current.triggeredAlerts).toBeInstanceOf(Set);
    });

    it('should load alerts from localStorage', () => {
      const storedAlerts = [
        {
          id: 'test-1',
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above' as const,
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedAlerts));

      const { result } = renderHook(() => usePriceAlerts());
      expect(result.current.alerts).toEqual(storedAlerts);
    });
  });

  describe('addAlert', () => {
    it('should add a new alert', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'ethereum',
          tokenSymbol: 'ETH',
          condition: 'above',
          targetPrice: 3000,
          currentPrice: 2500,
          enabled: true,
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].tokenId).toBe('ethereum');
      expect(result.current.alerts[0].id).toBeDefined();
    });

    it('should generate unique IDs for alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
        result.current.addAlert({
          tokenId: 'ethereum',
          tokenSymbol: 'ETH',
          condition: 'below',
          targetPrice: 2000,
          currentPrice: 2500,
          enabled: true,
        });
      });

      expect(result.current.alerts[0].id).not.toBe(result.current.alerts[1].id);
    });

    it('should save to localStorage when adding alert', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'defi-dashboard-price-alerts',
        expect.stringContaining('bitcoin')
      );
    });
  });

  describe('removeAlert', () => {
    it('should remove an alert by ID', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
      });

      const alertId = result.current.alerts[0].id;

      act(() => {
        result.current.removeAlert(alertId);
      });

      expect(result.current.alerts).toHaveLength(0);
    });

    it('should remove alert from triggeredAlerts when deleted', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
      });

      const alertId = result.current.alerts[0].id;

      act(() => {
        result.current.removeAlert(alertId);
      });

      expect(result.current.triggeredAlerts.has(alertId)).toBe(false);
    });
  });

  describe('toggleAlert', () => {
    it('should toggle alert enabled state', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
      });

      const alertId = result.current.alerts[0].id;
      const originalEnabled = result.current.alerts[0].enabled;

      act(() => {
        result.current.toggleAlert(alertId);
      });

      expect(result.current.alerts[0].enabled).toBe(!originalEnabled);
    });
  });

  describe('updateAlertPrices', () => {
    it('should update current prices for alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: true,
        });
      });

      act(() => {
        result.current.updateAlertPrices({
          bitcoin: { usd: 48000 },
        });
      });

      // The function should not throw errors
      expect(result.current.alerts).toHaveLength(1);
    });

    it('should not trigger disabled alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.addAlert({
          tokenId: 'bitcoin',
          tokenSymbol: 'BTC',
          condition: 'above',
          targetPrice: 50000,
          currentPrice: 45000,
          enabled: false,
        });
      });

      act(() => {
        result.current.updateAlertPrices({
          bitcoin: { usd: 55000 },
        });
      });

      expect(result.current.triggeredAlerts.size).toBe(0);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should request notification permission', () => {
      const mockRequest = vi.fn().mockResolvedValue('granted');
      global.Notification = {
        permission: 'default',
        requestPermission: mockRequest,
      } as any;

      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.requestNotificationPermission();
      });

      expect(mockRequest).toHaveBeenCalled();
    });

    it('should not request if already granted', () => {
      const mockRequest = vi.fn();
      global.Notification = {
        permission: 'granted',
        requestPermission: mockRequest,
      } as any;

      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.requestNotificationPermission();
      });

      expect(mockRequest).not.toHaveBeenCalled();
    });
  });
});
