import { useState, useEffect } from 'react';

export interface PriceAlert {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  enabled: boolean;
}

const STORAGE_KEY = 'defi-dashboard-price-alerts';

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());

  // Load alerts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAlerts(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load alerts:', error);
      }
    }
  }, []);

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    if (alerts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    }
  }, [alerts]);

  const addAlert = (alert: Omit<PriceAlert, 'id'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `${alert.tokenId}-${alert.condition}-${alert.targetPrice}-${Date.now()}`,
    };
    setAlerts(prev => [...prev, newAlert]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setTriggeredAlerts(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const updateAlertPrices = (prices: Record<string, { usd: number }>) => {
    const newTriggered = new Set(triggeredAlerts);
    
    alerts.forEach(alert => {
      if (!alert.enabled || newTriggered.has(alert.id)) return;
      
      const priceData = prices[alert.tokenId];
      if (!priceData) return;
      
      const shouldTrigger = 
        (alert.condition === 'above' && priceData.usd >= alert.targetPrice) ||
        (alert.condition === 'below' && priceData.usd <= alert.targetPrice);
      
      if (shouldTrigger) {
        newTriggered.add(alert.id);
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(`Price Alert: ${alert.tokenSymbol}`, {
            body: `${alert.tokenSymbol} is now ${priceData.usd.toLocaleString()} USD (${alert.condition} ${alert.targetPrice.toLocaleString()})`,
            icon: '/coin-icon.png',
          });
        }
      }
    });
    
    if (newTriggered.size !== triggeredAlerts.size) {
      setTriggeredAlerts(newTriggered);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return {
    alerts,
    triggeredAlerts,
    addAlert,
    removeAlert,
    toggleAlert,
    updateAlertPrices,
    requestNotificationPermission,
  };
}
