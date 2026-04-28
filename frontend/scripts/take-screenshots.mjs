import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:3000';
const outDir = path.resolve(process.cwd(), '..', 'docs', 'screenshots');

fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: '01-login', path: '/login' },
  { name: '02-dashboard', path: '/dashboard' },
  { name: '03-students', path: '/students' },
  { name: '04-grades', path: '/grades' },
  { name: '05-deliberation', path: '/deliberation' },
  { name: '06-laureates', path: '/laureates' },
  { name: '07-transfers', path: '/transfers' },
  { name: '08-teachers', path: '/teachers' },
  { name: '09-academic-modules-elements', path: '/academic' },
  { name: '10-cours-resources', path: '/cours-resources' },
  { name: '11-classes', path: '/classes' },
  { name: '12-classes-cours', path: '/classes/cours' },
  { name: '13-classes-transfer', path: '/classes/transfer' },
  { name: '14-timetable', path: '/timetable' },
  { name: '15-rooms', path: '/rooms' },
  { name: '16-room-reservations', path: '/room-reservations' },
  { name: '17-departments', path: '/departments' },
  { name: '18-filieres', path: '/filieres' },
  { name: '19-structure-options', path: '/structure' },
  { name: '20-cycles', path: '/cycles' },
  { name: '21-messages', path: '/messages' },
  { name: '22-restauration', path: '/restauration' },
  { name: '23-workflows', path: '/workflows' },
  { name: '24-users', path: '/users' },
  { name: '25-statistics', path: '/statistics' },
  { name: '26-settings-academic-years', path: '/settings/academic-years' },
  { name: '27-settings-restauration', path: '/settings/restauration' },
  { name: '28-settings-document-types', path: '/settings/document-types' },
  { name: '29-settings-teacher-roles', path: '/settings/teacher-roles' },
  { name: '30-settings-teacher-grades', path: '/settings/teacher-grades' },
  { name: '31-settings-profile-document-types', path: '/settings/profile-document-types' },
  { name: '32-activity-logs', path: '/activity-logs' },
];

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();

for (const t of targets) {
  const url = `${baseUrl}${t.path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  if (t.path === '/login') {
    if (page.url().includes('/login')) {
      await page.waitForSelector('button[type="submit"]', { timeout: 20000 });
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 25000 });
    }
  }

  if (t.path !== '/login') {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  await page.waitForTimeout(1600);
  const filePath = path.join(outDir, `${t.name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved ${filePath}`);
}

await browser.close();
console.log('✅ Screenshots captured');
