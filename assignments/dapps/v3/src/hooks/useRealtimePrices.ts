import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTokenPrices } from '../services/coingecko';

interface PriceUpdate {
  id: string;
  price: number;
  change24h: number;
  timestamp: number;
}

export function useRealtimePrices(tokenIds: string[], enabled = true) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || tokenIds.length === 0) return;

    // Initial fetch
    const fetchPrices = async () => {
      try {
        const data = await getTokenPrices(tokenIds);
        const updates: Record<string, PriceUpdate> = {};
        for (const [id, priceData] of Object.entries(data)) {
          updates[id] = {
            id,
            price: priceData.usd,
            change24h: priceData.usd_24h_change,
            timestamp: Date.now(),
          };
        }
        setPrices(updates);
        
        // Update query cache for other hooks
        queryClient.setQueryData(['tokenPrices', tokenIds], data);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();

    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, [tokenIds, enabled, queryClient]);

  return prices;
}
