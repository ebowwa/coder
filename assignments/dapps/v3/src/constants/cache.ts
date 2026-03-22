/**
 * Cache stale times for React Query
 * All values in milliseconds
 */
export const STALE_TIME = {
  MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
} as const;
