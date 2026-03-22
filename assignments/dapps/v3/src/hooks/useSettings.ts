import { useState, useCallback, useEffect } from 'react';
import type { Settings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    // Lazy initialization - read from localStorage only on first render
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    
    try {
      const stored = localStorage.getItem('defi-dashboard-settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading settings from localStorage:', error);
      return DEFAULT_SETTINGS;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    try {
      localStorage.setItem('defi-dashboard-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMultipleSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const getCurrencySymbol = useCallback(() => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£'
    };
    return symbols[settings.currency];
  }, [settings.currency]);

  return {
    settings,
    updateSetting,
    updateMultipleSettings,
    resetSettings,
    isLoading,
    getCurrencySymbol,
  };
}