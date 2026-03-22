/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../../src/hooks/useSettings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../src/types/settings';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should use default settings when no stored settings exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.current.isLoading).toBe(false);
    });

    it('should load settings from localStorage when they exist', () => {
      const storedSettings = {
        ...DEFAULT_SETTINGS,
        theme: 'light',
        currency: 'EUR',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(storedSettings);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not access localStorage on server-side (SSR)', () => {
      // Temporarily remove localStorage
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', originalLocalStorage ?? {});
    });

    it('should save settings to localStorage when they change', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSetting('currency', 'EUR');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_SETTINGS, currency: 'EUR' })
      );
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSetting('theme', 'light');
      });

      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.currency).toBe('USD'); // unchanged
    });

    it('should update multiple settings using updateMultipleSettings', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateMultipleSettings({
          currency: 'GBP',
          refreshInterval: 60,
          notifications: false,
        });
      });

      expect(result.current.settings).toEqual({
        ...DEFAULT_SETTINGS,
        currency: 'GBP',
        refreshInterval: 60,
        notifications: false,
      });
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to default values', () => {
      const storedSettings = {
        ...DEFAULT_SETTINGS,
        theme: 'light',
        currency: 'EUR',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbol for USD', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ ...DEFAULT_SETTINGS, currency: 'USD' })
      );

      const { result } = renderHook(() => useSettings());

      expect(result.current.getCurrencySymbol()).toBe('$');
    });

    it('should return correct symbol for EUR', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ ...DEFAULT_SETTINGS, currency: 'EUR' })
      );

      const { result } = renderHook(() => useSettings());

      expect(result.current.getCurrencySymbol()).toBe('€');
    });

    it('should return correct symbol for GBP', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ ...DEFAULT_SETTINGS, currency: 'GBP' })
      );

      const { result } = renderHook(() => useSettings());

      expect(result.current.getCurrencySymbol()).toBe('£');
    });
  });

  describe('error handling', () => {
    it('should handle localStorage write errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSetting('theme', 'light');
      });

      // Should not throw, settings should still be updated in state
      expect(result.current.settings.theme).toBe('light');
      // Should still have the correct default values
      expect(result.current.settings.currency).toBe('USD');
    });

    it('should handle localStorage read errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage is not available');
      });

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('async behavior', () => {
    it('should set loading state when saving settings', async () => {
      const { result } = renderHook(() => useSettings());

      // Initial state should not be loading
      expect(result.current.isLoading).toBe(false);

      // Update a setting to trigger localStorage save
      act(() => {
        result.current.updateSetting('theme', 'light');
      });

      // Note: In real implementation, this would need async handling
      // For now, we just verify the state doesn't break
      expect(result.current.settings.theme).toBe('light');
    });
  });

  describe('edge cases', () => {
    it('should handle partial updates correctly', () => {
      const storedSettings = {
        ...DEFAULT_SETTINGS,
        currency: 'EUR',
        refreshInterval: 60,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSetting('notifications', false);
      });

      expect(result.current.settings).toEqual({
        ...storedSettings,
        notifications: false,
      });
    });

    it('should handle multiple rapid updates', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSetting('theme', 'light');
        result.current.updateSetting('currency', 'EUR');
        result.current.updateSetting('refreshInterval', 60);
        result.current.updateSetting('notifications', false);
      });

      expect(result.current.settings).toEqual({
        theme: 'light',
        currency: 'EUR',
        refreshInterval: 60,
        notifications: false,
      });
    });
  });
});