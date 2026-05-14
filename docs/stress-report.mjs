import fs from 'node:fs';
import path from 'node:path';

const apiBaseUrl = process.env.STRESS_API_URL ?? 'http://127.0.0.1:5000/api';
const frontendBaseUrl = process.env.STRESS_FRONTEND_URL ?? 'http://127.0.0.1:3001';
const durationSeconds = Number(process.env.STRESS_DURATION_SECONDS ?? 12);
const timeoutMs = Number(process.env.STRESS_TIMEOUT_MS ?? 10000);
const stages = (process.env.STRESS_STAGES ?? '5,10,15')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const outputDir = path.resolve(process.env.STRESS_OUTPUT_DIR ?? 'docs/stress-results');

const credentials = {
  identifier: process.env.STRESS_IDENTIFIER ?? 'admin',
  password: process.env.STRESS_PASSWORD ?? 'admin',
};

const apiTargets = [
  '/dashboard/overview',
  '/students',
  '/teachers',
  '/classes',
  '/grades',
  '/academic-modules',
  '/element-modules',
  '/cours',
  '/rooms',
  '/room-reservations',
  '/departments',
  '/filieres',
  '/cycles',
  '/users',
  '/analytics/overview',
  '/restauration/meals',
  '/activity-logs',
  '/documents',
  '/internat/rooms',
];

const frontendTargets = ['/login', '/dashboard', '/students', '/teachers', '/classes'];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function summarize(name, concurrency, results, elapsedSeconds) {
  const latencies = results.map((result) => result.ms).sort((a, b) => a - b);
  const ok = results.filter((result) => result.ok).length;
  const failed = results.length - ok;
  const byStatus = new Map();

  for (const result of results) {
    const key = result.status ?? result.error ?? 'unknown';
    byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
  }

  return {
    name,
    concurrency,
    durationSeconds: Number(elapsedSeconds.toFixed(2)),
    requests: results.length,
    ok,
    failed,
    errorRate: Number((results.length === 0 ? 0 : failed / results.length).toFixed(4)),
    rps: Number((results.length / elapsedSeconds).toFixed(2)),
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    max: Math.round(latencies.at(-1) ?? 0),
    statuses: Object.fromEntries([...byStatus.entries()].sort()),
  };
}

async function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status, ms: performance.now() - started };
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'AbortError' ? 'timeout' : 'network-error',
      ms: performance.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) throw new Error(`Login failed with status ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Login response did not include access_token');
  return data.access_token;
}

async function runPool(name, concurrency, urls, optionsFactory) {
  const results = [];
  const deadline = Date.now() + durationSeconds * 1000;
  let nextIndex = 0;

  async function worker() {
    while (Date.now() < deadline) {
      const url = urls[nextIndex % urls.length];
      nextIndex += 1;
      results.push(await timedFetch(url, optionsFactory()));
    }
  }

  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedSeconds = (performance.now() - started) / 1000;
  return summarize(name, concurrency, results, elapsedSeconds);
}

function makeXml(report, graphFileName) {
  const stagesXml = report.stages
    .map((stage) => {
      const targetsXml = [stage.apiSummary, stage.frontendSummary]
        .map((summary) => {
          const statusesXml = Object.entries(summary.statuses)
            .map(([status, count]) => `        <status code="${escapeXml(status)}" count="${count}" />`)
            .join('\n');

          return `      <target name="${escapeXml(summary.name)}" requests="${summary.requests}" ok="${summary.ok}" failed="${summary.failed}" errorRate="${summary.errorRate}" rps="${summary.rps}" p50Ms="${summary.p50}" p95Ms="${summary.p95}" p99Ms="${summary.p99}" maxMs="${summary.max}">
${statusesXml}
      </target>`;
        })
        .join('\n');

      return `    <stage concurrency="${stage.concurrency}" durationSeconds="${stage.durationSeconds}">
${targetsXml}
    </stage>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<stressTest generatedAt="${escapeXml(report.generatedAt)}" apiBaseUrl="${escapeXml(report.apiBaseUrl)}" frontendBaseUrl="${escapeXml(report.frontendBaseUrl)}" graph="${escapeXml(graphFileName)}">
  <configuration stages="${escapeXml(report.config.stages.join(','))}" durationSeconds="${report.config.durationSeconds}" timeoutMs="${report.config.timeoutMs}" />
  <results>
${stagesXml}
  </results>
</stressTest>
`;
}

function makeSvg(report) {
  const width = 980;
  const height = 520;
  const padding = { left: 76, right: 36, top: 44, bottom: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const allP95 = report.stages.flatMap((stage) => [stage.apiSummary.p95, stage.frontendSummary.p95]);
  const maxY = Math.max(1000, Math.ceil(Math.max(...allP95) / 1000) * 1000);
  const xFor = (index) =>
    padding.left + (report.stages.length === 1 ? plotWidth / 2 : (plotWidth * index) / (report.stages.length - 1));
  const yFor = (value) => padding.top + plotHeight - (value / maxY) * plotHeight;

  const lineFor = (pick, color) => {
    const points = report.stages
      .map((stage, index) => `${xFor(index)},${yFor(pick(stage))}`)
      .join(' ');
    const circles = report.stages
      .map((stage, index) => {
        const x = xFor(index);
        const y = yFor(pick(stage));
        return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" />`;
      })
      .join('\n');
    return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${points}" />
${circles}`;
  };

  const yTicks = Array.from({ length: 6 }, (_, index) => Math.round((maxY * index) / 5));
  const grid = yTicks
    .map((tick) => {
      const y = yFor(tick);
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#d8e2dc" />
<text x="${padding.left - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="#405064">${tick}</text>`;
    })
    .join('\n');
  const xLabels = report.stages
    .map((stage, index) => {
      const x = xFor(index);
      return `<text x="${x}" y="${height - 36}" text-anchor="middle" font-size="13" fill="#102033">${stage.concurrency}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${padding.left}" y="26" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#102033">DEAA-Hub Stress Test: P95 Latency by Concurrency</text>
  <text x="${padding.left}" y="${height - 14}" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Concurrency</text>
  <text x="18" y="${padding.top + plotHeight / 2}" transform="rotate(-90 18 ${padding.top + plotHeight / 2})" font-family="Arial, sans-serif" font-size="12" fill="#64748b">P95 latency (ms)</text>
  <g font-family="Arial, sans-serif">
${grid}
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="#8391a1" />
    <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}" stroke="#8391a1" />
${xLabels}
${lineFor((stage) => stage.apiSummary.p95, '#0f6b4f')}
${lineFor((stage) => stage.frontendSummary.p95, '#1d4ed8')}
    <rect x="${width - 250}" y="54" width="190" height="64" rx="6" fill="#f8fafc" stroke="#d8e2dc" />
    <line x1="${width - 232}" y1="78" x2="${width - 198}" y2="78" stroke="#0f6b4f" stroke-width="3" />
    <text x="${width - 188}" y="82" font-size="13" fill="#102033">API P95</text>
    <line x1="${width - 232}" y1="100" x2="${width - 198}" y2="100" stroke="#1d4ed8" stroke-width="3" />
    <text x="${width - 188}" y="104" font-size="13" fill="#102033">Frontend P95</text>
  </g>
</svg>
`;
}

fs.mkdirSync(outputDir, { recursive: true });

const token = await login();
const apiUrls = apiTargets.map((target) => `${apiBaseUrl}${target}`);
const frontendUrls = frontendTargets.map((target) => `${frontendBaseUrl}${target}`);
const stageResults = [];

console.log(`Stress report: stages ${stages.join(', ')} for ${durationSeconds}s each`);

for (const concurrency of stages) {
  console.log(`Running concurrency ${concurrency}...`);
  const apiSummary = await runPool('api-authenticated-get', concurrency, apiUrls, () => ({
    headers: { authorization: `Bearer ${token}` },
  }));
  const frontendSummary = await runPool('frontend-pages', concurrency, frontendUrls, () => ({}));
  stageResults.push({
    concurrency,
    durationSeconds,
    apiSummary,
    frontendSummary,
  });
  console.table([apiSummary, frontendSummary]);
}

const report = {
  generatedAt: new Date().toISOString(),
  apiBaseUrl,
  frontendBaseUrl,
  config: { stages, durationSeconds, timeoutMs },
  stages: stageResults,
};

const jsonPath = path.join(outputDir, 'stress-results.json');
const xmlPath = path.join(outputDir, 'stress-results.xml');
const svgPath = path.join(outputDir, 'stress-results.svg');

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(xmlPath, makeXml(report, path.basename(svgPath)), 'utf8');
fs.writeFileSync(svgPath, makeSvg(report), 'utf8');

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${xmlPath}`);
console.log(`Wrote ${svgPath}`);
