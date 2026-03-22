import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        html: '<!DOCTYPE html><html><body></body></html>',
        url: 'http://localhost',
        pretendToBeVisual: true,
      },
    },
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
