/**
 * Vitest Setup File
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.ethereum
global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  };
};

// Mock IntersectionObserver
global.IntersectionObserver = global.IntersectionObserver || class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
