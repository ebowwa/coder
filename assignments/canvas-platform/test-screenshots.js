import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const THEMES = [
  { id: 'csueb', name: 'Cal State East Bay' },
  { id: 'berkeley', name: 'UC Berkeley' },
  { id: 'scu', name: 'Santa Clara University' },
  { id: 'ohlone', name: 'Ohlone College' }
];

const PORT = 3456;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Ensure screenshots directory exists
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Starting local server...');
  const server = spawn('bunx', ['serve', '-p', String(PORT)], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  // Wait for server to start
  await sleep(3000);

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // High DPI for better quality
  });

  const page = await context.newPage();

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(1500);

    // Take screenshots for each theme
    for (const theme of THEMES) {
      console.log(`\nCapturing ${theme.name} theme...`);

      // Select the theme
      await page.selectOption('#school-select', theme.id);
      await sleep(800); // Wait for theme to apply

      // Full page screenshot
      const fullPagePath = join(SCREENSHOTS_DIR, `${theme.id}-full.png`);
      await page.screenshot({
        path: fullPagePath,
        fullPage: true
      });
      console.log(`  ✓ Full page: ${theme.id}-full.png`);

      // Dashboard view (above fold) - main visible area
      const dashboardPath = join(SCREENSHOTS_DIR, `${theme.id}-dashboard.png`);
      await page.screenshot({
        path: dashboardPath,
        clip: { x: 0, y: 0, width: 1440, height: 900 }
      });
      console.log(`  ✓ Dashboard: ${theme.id}-dashboard.png`);

      // Header only
      const headerPath = join(SCREENSHOTS_DIR, `${theme.id}-header.png`);
      await page.screenshot({
        path: headerPath,
        clip: { x: 0, y: 0, width: 1440, height: 64 }
      });
      console.log(`  ✓ Header: ${theme.id}-header.png`);

      // Sidebar only
      const sidebarPath = join(SCREENSHOTS_DIR, `${theme.id}-sidebar.png`);
      await page.screenshot({
        path: sidebarPath,
        clip: { x: 0, y: 64, width: 260, height: 600 }
      });
      console.log(`  ✓ Sidebar: ${theme.id}-sidebar.png`);

      // Courses section (in the main content area)
      const coursesPath = join(SCREENSHOTS_DIR, `${theme.id}-courses.png`);
      await page.screenshot({
        path: coursesPath,
        clip: { x: 280, y: 340, width: 1100, height: 350 }
      });
      console.log(`  ✓ Courses: ${theme.id}-courses.png`);
    }

    // Create comparison image info
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\nTheme comparison:');
    THEMES.forEach(theme => {
      console.log(`  📸 ${theme.name}: ${theme.id}-dashboard.png`);
    });

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch(console.error);
