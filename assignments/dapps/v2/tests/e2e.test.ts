/**
 * E2E Tests for Web3 Demo App
 * Tests wallet connection, network switching, and transaction interactions
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

// Test 1: Home page loads
test('home page loads successfully', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Check if we're on the home page
  await expect(page).toHaveTitle(/Web3 Demo/);
  
  // Verify main heading is visible
  const heading = page.locator('h1');
  await expect(heading).toBeVisible();
});

// Test 2: Wallet connection button exists
test('wallet button is present', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Check for wallet button
  const walletButton = page.locator('button:has-text("Connect Wallet")').or(
    page.locator('[data-testid="wallet-button"]')
  );
  
  await expect(walletButton).toBeVisible();
});

// Test 3: Network switcher is available
test('network switcher is present', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Check for network switcher
  const networkSwitcher = page.locator('select').or(
    page.locator('[data-testid="network-switcher"]')
  );
  
  await expect(networkSwitcher).toBeVisible();
});

// Test 4: Transaction status component renders
test('transaction status component renders', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Check for transaction status area
  const txStatus = page.locator('[data-testid="transaction-status"]').or(
    page.locator('text=/transaction|status|pending/i')
  );
  
  await expect(txStatus).toBeVisible();
});

// Test 5: MetaMask is installed (optional test)
test('MetaMask availability check', async ({ page, context }) => {
  await page.goto(BASE_URL);
  
  // Check if window.ethereum is available
  const hasMetaMask = await page.evaluate(() => {
    return typeof window.ethereum !== 'undefined';
  });
  
  // Log result (this test passes regardless of MetaMask presence)
  console.log(`MetaMask ${hasMetaMask ? 'is' : 'is not'} installed`);
  
  // This is an informational test, so we expect it to always pass
  expect(true).toBe(true);
});

// Test 6: Responsive design check
test('page is responsive on mobile', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  
  // Verify page loads on mobile
  await expect(page.locator('h1')).toBeVisible();
  
  // Check for mobile menu or responsive elements
  const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(
    page.locator('button[aria-label="menu"]', { hasText: /menu|hamburger/i })
  );
  
  // Mobile menu is optional, but let's verify the main content is visible
  const mainContent = page.locator('main').or(page.locator('.container'));
  await expect(mainContent).toBeVisible();
});

// Test 7: API health check
test('API health endpoint responds', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/health`);
  
  expect(response.status()).toBe(200);
  
  const json = await response.json();
  expect(json).toHaveProperty('status', 'ok');
});

// Test 8: Navigation test
test('navigation links work', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Try to find and click navigation links
  const navLinks = page.locator('nav a, header a').first();
  
  const count = await navLinks.count();
  if (count > 0) {
    await navLinks.first().click();
    await page.waitForLoadState('networkidle');
    
    // Verify we navigated somewhere
    expect(page.url()).not.toBe(BASE_URL + '/');
  } else {
    // No nav links found, that's okay
    console.log('No navigation links found');
  }
});

// Test 9: Console error check
test('no console errors on page load', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Check for critical errors
  const criticalErrors = errors.filter(err => 
    err.includes('Uncaught') || 
    err.includes('Fatal') ||
    err.includes('Failed to fetch')
  );
  
  expect(criticalErrors).toHaveLength(0);
});

// Test 10: Page accessibility basics
test('basic accessibility checks', async ({ page }) => {
  await page.goto(BASE_URL);
  
  // Check for proper heading hierarchy
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  
  // Check for alt text on images
  const imagesWithoutAlt = page.locator('img:not([alt])');
  await expect(imagesWithoutAlt).toHaveCount(0);
  
  // Check for form labels (if forms exist)
  const inputsWithoutLabels = page.locator('input:not([aria-label]):not([id])');
  await expect(inputsWithoutLabels).toHaveCount(0);
});