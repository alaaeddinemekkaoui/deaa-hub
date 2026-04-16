import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://localhost:3000';
const outDir = path.resolve(process.cwd(), '..', 'docs', 'screenshots');

fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: '01-login', path: '/login' },
  { name: '02-dashboard', path: '/dashboard' },
  { name: '03-students', path: '/students' },
  { name: '04-teachers', path: '/teachers' },
  { name: '05-classes', path: '/classes' },
  { name: '06-academic-modules-elements', path: '/academic' },
  { name: '07-rooms', path: '/rooms' },
  { name: '08-room-reservations', path: '/room-reservations' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
});
const page = await context.newPage();

for (const t of targets) {
  const url = `${baseUrl}${t.path}`;
  await page.goto(url, { waitUntil: 'networkidle' });

  // Login once when we reach /login
  if (t.path === '/login') {
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  // Ensure protected pages settle after navigation
  if (t.path !== '/login') {
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  await page.waitForTimeout(1000);
  const filePath = path.join(outDir, `${t.name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved ${filePath}`);
}

await browser.close();
console.log('✅ Screenshots captured');
