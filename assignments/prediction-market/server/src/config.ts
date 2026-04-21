/**
 * Application configuration
 * Centralizes all hardcoded values for easy configuration
 */

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  
  // Default values
  defaults: {
    startingBalance: 1000,
    initialLiquidity: 100,
  },
  
  // Validation limits
  validation: {
    question: {
      minLength: 5,
      maxLength: 500,
    },
    description: {
      maxLength: 2000,
    },
    userName: {
      minLength: 1,
      maxLength: 50,
    },
    groupName: {
      minLength: 1,
      maxLength: 100,
    },
    inviteCode: {
      minLength: 4,
      maxLength: 10,
    },
    shares: {
      min: 0.01,
      max: 1000000,
    },
    initialLiquidity: {
      min: 10,
      max: 100000,
    },
    startingBalance: {
      min: 100,
      max: 1000000,
    },
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
} as const;

export type Config = typeof config;
