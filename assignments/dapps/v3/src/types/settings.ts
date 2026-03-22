export type Theme = 'light' | 'dark' | 'system';

export type Currency = 'USD' | 'EUR' | 'GBP';

export type RefreshInterval = 15 | 30 | 60;

export interface Settings {
  theme: Theme;
  currency: Currency;
  refreshInterval: RefreshInterval;
  notifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  currency: 'USD',
  refreshInterval: 30,
  notifications: true,
};

export const SETTINGS_STORAGE_KEY = 'defi-dashboard-settings';