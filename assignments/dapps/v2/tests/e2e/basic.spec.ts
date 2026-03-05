import { test, expect } from '@playwright/test';

test.describe('Crypto DApp Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('loads the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Crypto DApp/i);
  });

  test('renders the root element', async ({ page }) => {
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('has working health endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });

  test('loads CSS styles', async ({ page }) => {
    const link = page.locator('link[rel="stylesheet"]');
    await expect(link).toHaveAttribute('href', /styles\/globals\.css/);
  });

  test('loads main.tsx module', async ({ page }) => {
    const script = page.locator('script[type="module"]');
    await expect(script).toHaveAttribute('src', /\/src\/main\.tsx/);
  });
});
