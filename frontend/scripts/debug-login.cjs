const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
  const buttonCount = await page.locator('button[type="submit"]').count();
  console.log('submitButtons=', buttonCount, 'url=', page.url());

  await page.screenshot({ path: '../docs/screenshots/debug-login.png', fullPage: true });
  await browser.close();
})();
