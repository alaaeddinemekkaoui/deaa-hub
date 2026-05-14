import fs from 'node:fs';
import path from 'node:path';

const inputPath = path.resolve(process.env.PEAK_INPUT ?? 'docs/stress-results/stress-results.json');
const outputDir = path.resolve(process.env.PEAK_OUTPUT_DIR ?? 'docs/stress-results');
const peakUsers = Number(process.env.PEAK_USERS ?? 3000);
const usersPerActiveRequest = Number(process.env.PEAK_USERS_PER_ACTIVE_REQUEST ?? 20);
const activeConcurrency = Math.ceil(peakUsers / usersPerActiveRequest);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(value) {
  return escapeXml(value);
}

function lerp(a, b, ratio) {
  return a + (b - a) * ratio;
}

function interpolate(points, x, metric) {
  const sorted = [...points].sort((a, b) => a.concurrency - b.concurrency);
  if (x <= sorted[0].concurrency) return sorted[0][metric];

  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const next = sorted[index];
    if (x <= next.concurrency) {
      const ratio = (x - prev.concurrency) / (next.concurrency - prev.concurrency);
      return lerp(prev[metric], next[metric], ratio);
    }
  }

  const last = sorted.at(-1);
  const prev = sorted.at(-2) ?? sorted[0];
  const slope = (last[metric] - prev[metric]) / Math.max(1, last.concurrency - prev.concurrency);
  const projected = last[metric] + slope * (x - last.concurrency);
  return Math.max(last[metric], projected);
}

function measuredPoints(report, key) {
  return report.stages.map((stage) => ({
    concurrency: stage.concurrency,
    p95: stage[key].p95,
    p50: stage[key].p50,
    rps: stage[key].rps,
    errorRate: stage[key].errorRate,
  }));
}

function project(report, key) {
  const points = measuredPoints(report, key);
  const p50 = Math.round(interpolate(points, activeConcurrency, 'p50'));
  const p95 = Math.max(p50, Math.round(interpolate(points, activeConcurrency, 'p95')));
  const rps = Number(interpolate(points, activeConcurrency, 'rps').toFixed(2));

  return {
    activeConcurrency,
    p50,
    p95,
    rps,
    status:
      p95 <= 1000 ? 'good' :
      p95 <= 2500 ? 'watch' :
      p95 <= 5000 ? 'risk' :
      'critical',
  };
}

function makeXml(report, apiProjection, frontendProjection) {
  const stagesXml = report.stages
    .map((stage) => `    <measuredStage concurrency="${stage.concurrency}">
      <api p50Ms="${stage.apiSummary.p50}" p95Ms="${stage.apiSummary.p95}" rps="${stage.apiSummary.rps}" errorRate="${stage.apiSummary.errorRate}" />
      <frontend p50Ms="${stage.frontendSummary.p50}" p95Ms="${stage.frontendSummary.p95}" rps="${stage.frontendSummary.rps}" errorRate="${stage.frontendSummary.errorRate}" />
    </measuredStage>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<peakSimulation generatedAt="${escapeXml(new Date().toISOString())}" peakUsers="${peakUsers}" activeConcurrencyModel="${activeConcurrency}" usersPerActiveRequest="${usersPerActiveRequest}">
  <summary>
    <message>Projection model: ${peakUsers} online users with about 1 active request per ${usersPerActiveRequest} users. This is a planning simulation based on measured stress-test data, not a full 3000-browser live test.</message>
    <api status="${apiProjection.status}" projectedP50Ms="${apiProjection.p50}" projectedP95Ms="${apiProjection.p95}" projectedRps="${apiProjection.rps}" />
    <frontend status="${frontendProjection.status}" projectedP50Ms="${frontendProjection.p50}" projectedP95Ms="${frontendProjection.p95}" projectedRps="${frontendProjection.rps}" />
  </summary>
  <measuredData source="${escapeXml(inputPath)}">
${stagesXml}
  </measuredData>
</peakSimulation>
`;
}

function makeSvg(report, apiProjection, frontendProjection) {
  const measured = report.stages.map((stage) => ({
    users: stage.concurrency,
    api: stage.apiSummary.p95,
    frontend: stage.frontendSummary.p95,
  }));
  const points = [...measured, { users: activeConcurrency, api: apiProjection.p95, frontend: frontendProjection.p95, projected: true }];
  const width = 1080;
  const height = 600;
  const pad = { left: 80, right: 40, top: 64, bottom: 82 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const maxX = Math.max(...points.map((point) => point.users));
  const maxY = Math.max(5000, Math.ceil(Math.max(...points.flatMap((point) => [point.api, point.frontend])) / 5000) * 5000);
  const xFor = (value) => pad.left + (value / maxX) * plotWidth;
  const yFor = (value) => pad.top + plotHeight - (value / maxY) * plotHeight;
  const line = (key, color) => {
    const poly = points.map((point) => `${xFor(point.users)},${yFor(point[key])}`).join(' ');
    const dots = points.map((point) => {
      const stroke = point.projected ? ' stroke="#111827" stroke-width="2"' : '';
      return `<circle cx="${xFor(point.users)}" cy="${yFor(point[key])}" r="${point.projected ? 7 : 5}" fill="${color}"${stroke} />`;
    }).join('\n');
    return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${poly}" />
${dots}`;
  };
  const ticks = [0, 1000, 2000, 3000, 5000, 10000, 15000, 20000].filter((tick) => tick <= maxY);
  const grid = ticks.map((tick) => `<line x1="${pad.left}" y1="${yFor(tick)}" x2="${width - pad.right}" y2="${yFor(tick)}" stroke="#e2e8f0" />
<text x="${pad.left - 12}" y="${yFor(tick) + 4}" text-anchor="end" font-size="12" fill="#475569">${tick}</text>`).join('\n');
  const xTicks = [...new Set([...report.stages.map((stage) => stage.concurrency), activeConcurrency])].sort((a, b) => a - b);
  const xLabels = xTicks.map((tick) => `<text x="${xFor(tick)}" y="${height - 42}" text-anchor="middle" font-size="13" fill="#475569">${tick}</text>`).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${pad.left}" y="30" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0f172a">DEAA-Hub Peak Simulation for ${peakUsers} Online Users</text>
  <text x="${pad.left}" y="52" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Model: ${usersPerActiveRequest} online users ≈ 1 active request, so ${peakUsers} online users ≈ ${activeConcurrency} active requests.</text>
  <g font-family="Arial, sans-serif">
${grid}
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotHeight}" stroke="#94a3b8" />
    <line x1="${pad.left}" y1="${pad.top + plotHeight}" x2="${width - pad.right}" y2="${pad.top + plotHeight}" stroke="#94a3b8" />
${xLabels}
${line('api', '#0f6b4f')}
${line('frontend', '#1d4ed8')}
    <text x="${pad.left}" y="${height - 16}" font-size="13" fill="#64748b">Active concurrent requests</text>
    <text x="18" y="${pad.top + plotHeight / 2}" transform="rotate(-90 18 ${pad.top + plotHeight / 2})" font-size="13" fill="#64748b">P95 response time (ms)</text>
    <rect x="${width - 300}" y="76" width="240" height="112" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
    <line x1="${width - 276}" y1="104" x2="${width - 236}" y2="104" stroke="#0f6b4f" stroke-width="3" />
    <text x="${width - 224}" y="108" font-size="13" fill="#0f172a">API P95</text>
    <line x1="${width - 276}" y1="130" x2="${width - 236}" y2="130" stroke="#1d4ed8" stroke-width="3" />
    <text x="${width - 224}" y="134" font-size="13" fill="#0f172a">Frontend P95</text>
    <circle cx="${width - 256}" cy="158" r="7" fill="#64748b" stroke="#111827" stroke-width="2" />
    <text x="${width - 224}" y="162" font-size="13" fill="#0f172a">Projected peak point</text>
  </g>
</svg>
`;
}

function makeHtml(report, apiProjection, frontendProjection) {
  const statusLabel = (status) =>
    ({
      good: 'BON',
      watch: 'A SURVEILLER',
      risk: 'RISQUE',
      critical: 'CRITIQUE',
    })[status] ?? status.toUpperCase();

  const measuredRows = report.stages
    .map((stage) => `      <tr>
        <td>${stage.concurrency}</td>
        <td>${stage.apiSummary.requests}</td>
        <td>${stage.apiSummary.p95} ms</td>
        <td>${stage.apiSummary.rps}</td>
        <td>${Math.round(stage.apiSummary.errorRate * 10000) / 100}%</td>
        <td>${stage.frontendSummary.requests}</td>
        <td>${stage.frontendSummary.p95} ms</td>
        <td>${stage.frontendSummary.rps}</td>
        <td>${Math.round(stage.frontendSummary.errorRate * 10000) / 100}%</td>
      </tr>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DEAA-Hub - Simulation de pic 3000 utilisateurs</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; line-height: 1.5; background: #ffffff; }
    h1 { margin-bottom: 4px; font-size: 30px; }
    h2 { margin-top: 34px; margin-bottom: 10px; font-size: 21px; }
    h3 { margin: 0 0 6px; font-size: 15px; }
    .note { color: #475569; max-width: 980px; }
    .hero { max-width: 1080px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; max-width: 1080px; margin: 22px 0; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #f8fafc; }
    .card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
    table { border-collapse: collapse; margin: 16px 0 24px; width: 100%; max-width: 1080px; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .explain { max-width: 1080px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .explain article { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .muted { color: #64748b; }
    .callout { max-width: 980px; border-left: 4px solid #0f6b4f; background: #f0fdf4; padding: 12px 16px; margin: 18px 0; }
    .risk, .critical { color: #b91c1c; font-weight: 700; }
    .watch { color: #a16207; font-weight: 700; }
    .good { color: #047857; font-weight: 700; }
    @media (max-width: 900px) {
      .cards, .explain { grid-template-columns: 1fr; }
      body { margin: 18px; }
      table { font-size: 12px; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>DEAA-Hub - Simulation de pic pour ${peakUsers} utilisateurs connectés</h1>
    <p class="note">Ce rapport est conçu pour une présentation non technique. Il explique la signification des chiffres du test de charge et la méthode utilisée pour estimer le comportement avec ${peakUsers} utilisateurs.</p>
  </section>

  <section class="cards">
    <div class="card"><div class="label">Utilisateurs simulés</div><div class="value">${peakUsers}</div><div class="muted">Personnes connectées à la plateforme.</div></div>
    <div class="card"><div class="label">Requêtes actives</div><div class="value">${activeConcurrency}</div><div class="muted">Requêtes simultanées estimées.</div></div>
    <div class="card"><div class="label">État API</div><div class="value ${apiProjection.status}">${statusLabel(apiProjection.status)}</div><div class="muted">P95 projeté : ${apiProjection.p95} ms.</div></div>
    <div class="card"><div class="label">État Frontend</div><div class="value ${frontendProjection.status}">${statusLabel(frontendProjection.status)}</div><div class="muted">P95 projeté : ${frontendProjection.p95} ms.</div></div>
  </section>

  <div class="callout">
    <strong>Conclusion principale :</strong> selon les données du test local, l'API et le frontend sont tous les deux projetés comme <strong>BON</strong> pour un pic de ${peakUsers} utilisateurs connectés.
    Cela signifie que la majorité des utilisateurs devraient recevoir des réponses rapidement, à condition que l'infrastructure de production ait une capacité comparable.
  </div>

  <h2>Comment lire le graphique</h2>
  <p class="note">Le graphique montre le temps de réponse P95. Plus la valeur est basse, meilleur est le résultat. Les premiers points viennent du vrai test de charge, et le dernier point représente la projection pour ${peakUsers} utilisateurs.</p>
  <img src="peak-3000-simulation.svg" alt="Graphique de simulation de pic" width="980">

  <h2>Signification des termes</h2>
  <section class="explain">
    <article>
      <h3>Utilisateurs connectés</h3>
      <p>Personnes connectées ou en train d'utiliser la plateforme pendant la même période. Tous les utilisateurs connectés ne cliquent pas exactement au même instant.</p>
    </article>
    <article>
      <h3>Requêtes actives</h3>
      <p>Nombre de requêtes qui arrivent au serveur en même temps. Ce rapport utilise le modèle suivant : 1 requête active pour ${usersPerActiveRequest} utilisateurs connectés. Donc ${peakUsers} utilisateurs connectés deviennent environ ${activeConcurrency} requêtes actives.</p>
    </article>
    <article>
      <h3>P50</h3>
      <p>Le temps de réponse médian. La moitié des requêtes sont plus rapides que cette valeur, et l'autre moitié est plus lente.</p>
    </article>
    <article>
      <h3>P95</h3>
      <p>Un indicateur important de l'expérience utilisateur. 95% des requêtes sont plus rapides que cette valeur. Il est souvent plus utile que la moyenne, car il montre ce que ressentent les utilisateurs les plus lents.</p>
    </article>
    <article>
      <h3>RPS</h3>
      <p>Requêtes par seconde. Cela indique le volume de trafic que le système a traité pendant le test.</p>
    </article>
    <article>
      <h3>Taux d'erreur</h3>
      <p>Pourcentage des requêtes échouées. 0% signifie que toutes les requêtes testées ont réussi.</p>
    </article>
  </section>

  <h2>Résultat projeté pour 3000 utilisateurs</h2>
  <table>
    <thead><tr><th>Zone</th><th>Ce que cela mesure</th><th>P50 projeté</th><th>P95 projeté</th><th>RPS projeté</th><th>État</th></tr></thead>
    <tbody>
      <tr><td>API</td><td>Réponses du backend et de la base de données : étudiants, enseignants, notes, tableau de bord, statistiques.</td><td>${apiProjection.p50} ms</td><td>${apiProjection.p95} ms</td><td>${apiProjection.rps}</td><td class="${apiProjection.status}">${statusLabel(apiProjection.status)}</td></tr>
      <tr><td>Frontend</td><td>Réponses des pages servies par l'application web.</td><td>${frontendProjection.p50} ms</td><td>${frontendProjection.p95} ms</td><td>${frontendProjection.rps}</td><td class="${frontendProjection.status}">${statusLabel(frontendProjection.status)}</td></tr>
    </tbody>
  </table>

  <h2>Données mesurées pendant le test</h2>
  <p class="note">Ces données sont les résultats réels utilisés pour créer la projection. Le test a augmenté progressivement le nombre de travailleurs actifs et a vérifié à la fois les endpoints API backend et les pages frontend.</p>
  <table>
    <thead>
      <tr>
        <th>Travailleurs actifs</th>
        <th>Requêtes API</th>
        <th>API P95</th>
        <th>API RPS</th>
        <th>Erreurs API</th>
        <th>Requêtes frontend</th>
        <th>Frontend P95</th>
        <th>Frontend RPS</th>
        <th>Erreurs frontend</th>
      </tr>
    </thead>
    <tbody>
${measuredRows}
    </tbody>
  </table>

  <h2>Signification de l'état</h2>
  <table>
    <thead><tr><th>État</th><th>Signification</th></tr></thead>
    <tbody>
      <tr><td class="good">BON</td><td>Le P95 est inférieur ou égal à 1 seconde. Le système devrait être ressenti comme rapide.</td></tr>
      <tr><td class="watch">A SURVEILLER</td><td>Le P95 est entre 1 et 2,5 secondes. C'est acceptable, mais à surveiller.</td></tr>
      <tr><td class="risk">RISQUE</td><td>Le P95 est entre 2,5 et 5 secondes. Les utilisateurs peuvent remarquer une lenteur.</td></tr>
      <tr><td class="critical">CRITIQUE</td><td>Le P95 est supérieur à 5 secondes. Il y a un risque de timeout et de frustration utilisateur.</td></tr>
    </tbody>
  </table>

  <h2>Notes importantes</h2>
  <p class="note">Ceci est une simulation de planification, et non un test destructif avec 3000 vrais navigateurs ouverts en même temps. Cette méthode est plus sûre et plus facile à expliquer, car elle utilise des mesures réelles sur des charges plus petites, puis projette le pic attendu. Pour un test officiel en production, il faut prévoir une fenêtre de maintenance, surveiller le CPU, la mémoire, les connexions à la base de données, et confirmer les limites d'hébergement avant d'augmenter le trafic.</p>
</body>
</html>
`;
}

const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const apiProjection = project(report, 'apiSummary');
const frontendProjection = project(report, 'frontendSummary');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'peak-3000-simulation.xml'), makeXml(report, apiProjection, frontendProjection), 'utf8');
fs.writeFileSync(path.join(outputDir, 'peak-3000-simulation.svg'), makeSvg(report, apiProjection, frontendProjection), 'utf8');
fs.writeFileSync(path.join(outputDir, 'peak-3000-simulation.html'), makeHtml(report, apiProjection, frontendProjection), 'utf8');
fs.writeFileSync(
  path.join(outputDir, 'peak-3000-simulation.json'),
  JSON.stringify({ peakUsers, usersPerActiveRequest, activeConcurrency, apiProjection, frontendProjection }, null, 2),
  'utf8',
);

console.log(`Peak simulation written to ${outputDir}`);
console.table([
  { area: 'API', ...apiProjection },
  { area: 'Frontend', ...frontendProjection },
]);
