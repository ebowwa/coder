import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import type { Settings } from '../../types/settings';

export function Settings() {
  const { settings, updateMultipleSettings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);

  const currencyOptions: Settings['currency'][] = ['USD', 'EUR', 'GBP'];
  const refreshIntervalOptions: Settings['refreshInterval'][] = [15, 30, 60];

  const handleCurrencyChange = (currency: Settings['currency']) => {
    updateMultipleSettings({ currency });
  };

  const handleRefreshIntervalChange = (interval: Settings['refreshInterval']) => {
    updateMultipleSettings({ refreshInterval: interval });
  };

  const handleNotificationsToggle = () => {
    updateMultipleSettings({ notifications: !settings.notifications });
  };

  const handleThemeChange = (theme: Settings['theme']) => {
    updateMultipleSettings({ theme });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold">Settings</h3>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as Settings['theme'][]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    settings.theme === theme
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {currencyOptions.map((currency) => (
                <button
                  key={currency}
                  onClick={() => handleCurrencyChange(currency)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    settings.currency === currency
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Refresh Interval (seconds)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {refreshIntervalOptions.map((interval) => (
                <button
                  key={interval}
                  onClick={() => handleRefreshIntervalChange(interval)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    settings.refreshInterval === interval
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {interval}s
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Notifications
              </label>
              <p className="text-xs text-gray-400">Enable price change alerts</p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}