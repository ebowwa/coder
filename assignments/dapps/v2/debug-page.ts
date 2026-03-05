import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  // Listen for network responses
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[NETWORK ${response.status()}]`, response.url());
    }
  });

  try {
    console.log('Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    console.log('\n=== WAITING FOR HYDRATION ===');
    await page.waitForTimeout(3000);

    console.log('\n=== PAGE TITLE ===');
    console.log(await page.title());

    console.log('\n=== VISIBLE TEXT ===');
    const bodyText = await page.evaluate(() => document.body?.innerText || 'No body');
    console.log(bodyText.substring(0, 500));

    console.log('\n=== PAGE STRUCTURE ===');
    const structure = await page.evaluate(() => {
      function getElementInfo(el: Element | null, depth = 0): string {
        if (!el) return '';
        const indent = '  '.repeat(depth);
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
        const text = el.textContent?.slice(0, 50) || '';
        return `${indent}${tag}${id}${classes} "${text}"\n` + 
               Array.from(el.children).map(c => getElementInfo(c, depth + 1)).join('');
      }
      return getElementInfo(document.body);
    });
    console.log(structure);

    console.log('\n=== ROOT ELEMENT ===');
    const rootInfo = await page.evaluate(() => {
      const root = document.querySelector('#root');
      if (!root) return 'No #root found';
      return {
        tagName: root.tagName,
        innerHTML: root.innerHTML.slice(0, 500),
        children: Array.from(root.children).map(c => ({
          tagName: c.tagName,
          className: c.className,
          textContent: c.textContent?.slice(0, 100)
        }))
      };
    });
    console.log(JSON.stringify(rootInfo, null, 2));

    console.log('\n=== REACT STATE ===');
    const reactState = await page.evaluate(() => {
      const root = document.querySelector('#root');
      if (!root) return { error: 'No root' };
      return {
        hasReact: !!(window as any).React,
        hasReactDOM: !!(window as any).ReactDOM,
        rootKeys: Object.keys(root),
        rootAttributes: Array.from(root.attributes).map(a => `${a.name}=${a.value}`)
      };
    });
    console.log(JSON.stringify(reactState, null, 2));

    console.log('\n=== SCREENSHOT ===');
    await page.screenshot({ path: '/tmp/dapp-debug.png', fullPage: true });
    console.log('Screenshot saved to /tmp/dapp-debug.png');

    console.log('\n=== PAGE HTML (first 1000 chars) ===');
    const html = await page.content();
    console.log(html.slice(0, 1000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugPage().catch(console.error);
