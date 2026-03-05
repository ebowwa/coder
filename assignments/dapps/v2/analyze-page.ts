import { chromium } from 'playwright';

async function analyzePage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== PAGE TITLE ===');
    console.log(await page.title());

    console.log('\n=== VISIBLE TEXT ===');
    const bodyText = await page.innerText('body');
    console.log(bodyText);

    console.log('\n=== PAGE STRUCTURE ===');
    const structure = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'No root element found';

      return {
        innerHTML: root.innerHTML.substring(0, 3000),
        children: Array.from(root.children).map(child => ({
          tagName: child.tagName,
          className: child.className,
          textContent: child.textContent?.substring(0, 200)
        }))
      };
    });
    console.log(JSON.stringify(structure, null, 2));

    console.log('\n=== CONSOLE LOGS ===');
    page.on('console', msg => console.log('Browser:', msg.text()));

    console.log('\n=== SCREENSHOT ===');
    await page.screenshot({ path: '/tmp/dapp-screenshot.png', fullPage: true });
    console.log('Screenshot saved to /tmp/dapp-screenshot.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

analyzePage();
