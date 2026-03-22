import { useMemo } from 'react';
import type { Token } from '../types/market';

export type SortField = 'market_cap' | 'price' | 'volume' | 'change_24h' | 'change_7d';
export type SortOrder = 'asc' | 'desc';

export interface TokenFilters {
  search: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  minChange24h?: number;
  maxChange24h?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export function useTokenFilters(tokens: Token[], filters: TokenFilters) {
  const filteredAndSorted = useMemo(() => {
    let result = [...tokens];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t =>
        t.symbol.toLowerCase().includes(searchLower) ||
        t.name.toLowerCase().includes(searchLower)
      );
    }

    // Market cap filter
    if (filters.minMarketCap !== undefined) {
      result = result.filter(t => t.market_cap >= filters.minMarketCap!);
    }
    if (filters.maxMarketCap !== undefined) {
      result = result.filter(t => t.market_cap <= filters.maxMarketCap!);
    }

    // Price filter
    if (filters.minPrice !== undefined) {
      result = result.filter(t => t.current_price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(t => t.current_price <= filters.maxPrice!);
    }

    // 24h change filter
    if (filters.minChange24h !== undefined) {
      result = result.filter(t => t.price_change_percentage_24h >= filters.minChange24h!);
    }
    if (filters.maxChange24h !== undefined) {
      result = result.filter(t => t.price_change_percentage_24h <= filters.maxChange24h!);
    }

    // Sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        let aVal: number;
        let bVal: number;

        switch (filters.sortBy) {
          case 'market_cap':
            aVal = a.market_cap;
            bVal = b.market_cap;
            break;
          case 'price':
            aVal = a.current_price;
            bVal = b.current_price;
            break;
          case 'volume':
            aVal = a.total_volume;
            bVal = b.total_volume;
            break;
          case 'change_24h':
            aVal = a.price_change_percentage_24h;
            bVal = b.price_change_percentage_24h;
            break;
          case 'change_7d':
            aVal = a.price_change_percentage_7d_in_currency || 0;
            bVal = b.price_change_percentage_7d_in_currency || 0;
            break;
          default:
            return 0;
        }

        const order = filters.sortOrder === 'asc' ? 1 : -1;
        return (aVal - bVal) * order;
      });
    }

    return result;
  }, [tokens, filters]);

  return filteredAndSorted;
}
