const apiBaseUrl = process.env.STRESS_API_URL ?? 'http://127.0.0.1:5000/api';
const frontendBaseUrl = process.env.STRESS_FRONTEND_URL ?? 'http://127.0.0.1:3001';
const durationSeconds = Number(process.env.STRESS_DURATION_SECONDS ?? 20);
const concurrency = Number(process.env.STRESS_CONCURRENCY ?? 10);
const timeoutMs = Number(process.env.STRESS_TIMEOUT_MS ?? 10000);

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

const frontendTargets = [
  '/login',
  '/dashboard',
  '/students',
  '/teachers',
  '/classes',
];

function percentile(values, p) {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function summarize(name, results, elapsedSeconds) {
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
    requests: results.length,
    ok,
    failed,
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
    return {
      ok: response.ok,
      status: response.status,
      ms: performance.now() - started,
    };
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

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Login response did not include access_token');
  }
  return data.access_token;
}

async function runPool(name, urls, optionsFactory) {
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
  return summarize(name, results, elapsedSeconds);
}

const token = await login();
const apiUrls = apiTargets.map((target) => `${apiBaseUrl}${target}`);
const frontendUrls = frontendTargets.map((target) => `${frontendBaseUrl}${target}`);

console.log(`Stress test: ${durationSeconds}s, concurrency ${concurrency}`);
console.log(`API: ${apiBaseUrl}`);
console.log(`Frontend: ${frontendBaseUrl}`);

const apiSummary = await runPool('api-authenticated-get', apiUrls, () => ({
  headers: { authorization: `Bearer ${token}` },
}));
const frontendSummary = await runPool('frontend-pages', frontendUrls, () => ({}));

console.table([apiSummary, frontendSummary]);
console.log(JSON.stringify({ apiSummary, frontendSummary }, null, 2));
