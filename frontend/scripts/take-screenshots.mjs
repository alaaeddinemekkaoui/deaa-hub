import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3000';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '..', '..', 'docs', 'screenshots');

fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: '01-login', path: '/login' },
  { name: '02-dashboard', path: '/dashboard', credentialKey: 'admin' },
  { name: '03-students', path: '/students', credentialKey: 'admin' },
  { name: '04-grades', path: '/grades', credentialKey: 'admin' },
  { name: '05-deliberation', path: '/deliberation', credentialKey: 'admin' },
  { name: '06-laureates', path: '/laureates', credentialKey: 'admin' },
  { name: '07-transfers', path: '/transfers', credentialKey: 'admin' },
  { name: '08-teachers', path: '/teachers', credentialKey: 'admin' },
  { name: '09-academic-modules-elements', path: '/academic', credentialKey: 'admin' },
  { name: '10-cours-resources', path: '/cours-resources', credentialKey: 'admin' },
  { name: '11-classes', path: '/classes', credentialKey: 'admin' },
  { name: '12-classes-cours', path: '/classes/cours', credentialKey: 'admin' },
  { name: '13-classes-transfer', path: '/classes/transfer', credentialKey: 'admin' },
  { name: '14-timetable', path: '/timetable', credentialKey: 'admin' },
  { name: '15-rooms', path: '/rooms', credentialKey: 'admin' },
  { name: '16-room-reservations', path: '/room-reservations', credentialKey: 'admin' },
  { name: '17-departments', path: '/departments', credentialKey: 'admin' },
  { name: '18-filieres', path: '/filieres', credentialKey: 'admin' },
  { name: '19-structure-options', path: '/structure', credentialKey: 'admin' },
  { name: '20-cycles', path: '/cycles', credentialKey: 'admin' },
  { name: '21-messages', path: '/messages', credentialKey: 'admin' },
  { name: '22-restauration', path: '/restauration', credentialKey: 'admin' },
  { name: '23-workflows', path: '/workflows', credentialKey: 'admin' },
  { name: '24-users', path: '/users', credentialKey: 'admin' },
  { name: '25-statistics', path: '/statistics', credentialKey: 'admin' },
  { name: '26-settings-academic-years', path: '/settings/academic-years', credentialKey: 'admin' },
  { name: '27-settings-restauration', path: '/settings/restauration', credentialKey: 'admin' },
  { name: '28-settings-document-types', path: '/settings/document-types', credentialKey: 'admin' },
  { name: '29-settings-teacher-roles', path: '/settings/teacher-roles', credentialKey: 'admin' },
  { name: '30-settings-teacher-grades', path: '/settings/teacher-grades', credentialKey: 'admin' },
  { name: '31-settings-profile-document-types', path: '/settings/profile-document-types', credentialKey: 'admin' },
  { name: '32-activity-logs', path: '/activity-logs', credentialKey: 'admin' },
  { name: '33-attendance', path: '/attendance', credentialKey: 'admin' },
  { name: '34-documents', path: '/documents', credentialKey: 'admin' },
  { name: '35-internat-rooms', path: '/internat', credentialKey: 'admin' },
  { name: '36-internat-assignments', path: '/internat/affectations', credentialKey: 'admin' },
  { name: '37-restauration-tickets', path: '/restauration/tickets', credentialKey: 'student' },
  { name: '38-restauration-verification', path: '/restauration/verification', credentialKey: 'restaurant' },
];

const credentials = {
  admin: { identifier: 'admin', password: 'admin' },
  student: { identifier: 'student.test', password: 'student123' },
  restaurant: { identifier: 'restaurant', password: 'admin' },
};

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const tokenCache = new Map();

function expandClip(box, viewport, padding) {
  const x = Math.max(0, Math.floor(box.x - padding));
  const y = Math.max(0, Math.floor(box.y - padding));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + padding));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + padding));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

async function captureFocusedScreenshot(target, filePath) {
  const viewport = page.viewportSize() ?? { width: 1440, height: 960 };
  const selector = target.path === '/login' ? 'form' : 'main .container-page';
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const box = await locator.boundingBox();
  if (!box) {
    await page.screenshot({ path: filePath, fullPage: false });
    return;
  }

  const clip = expandClip(box, viewport, target.path === '/login' ? 56 : 18);
  await page.screenshot({ path: filePath, clip });
}

async function getToken(credentialKey) {
  if (tokenCache.has(credentialKey)) {
    return tokenCache.get(credentialKey);
  }

  const creds = credentials[credentialKey];
  if (!creds) {
    throw new Error(`Unknown credential key: ${credentialKey}`);
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(creds),
  });

  if (!response.ok) {
    throw new Error(`Could not log in to API for ${credentialKey} (${response.status})`);
  }

  const data = await response.json();
  tokenCache.set(credentialKey, data.access_token);
  return data.access_token;
}

for (const t of targets) {
  const url = `${baseUrl}${t.path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  if (t.path === '/login') {
    await page.waitForSelector('button[type="submit"]', { timeout: 20000 });
  } else {
    const token = await getToken(t.credentialKey ?? 'admin');
    await page.evaluate((value) => {
      localStorage.removeItem('deaa_token');
      localStorage.setItem('deaa_token', value);
    }, token);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  await page.waitForTimeout(4200);
  const filePath = path.join(outDir, `${t.name}.png`);
  await captureFocusedScreenshot(t, filePath);
  console.log(`Saved ${filePath}`);
}

await browser.close();
console.log('✅ Screenshots captured');
