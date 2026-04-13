type CorsOrigin = boolean | Array<string | RegExp>;

const LOCALHOST_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const VERCEL_ORIGIN_REGEX = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveCorsOrigins(): CorsOrigin {
  const corsOriginConfig =
    process.env.FRONTEND_URLS ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000,http://localhost:3001';

  if (corsOriginConfig === '*') {
    return true;
  }

  const configuredOrigins = parseCorsOrigins(corsOriginConfig);
  const mergedOrigins = Array.from(
    new Set([...configuredOrigins, ...LOCALHOST_ORIGINS]),
  );
  const allowVercelOrigins = process.env.ALLOW_VERCEL_APP_ORIGINS !== 'false';

  if (!allowVercelOrigins) {
    return mergedOrigins;
  }

  return [...mergedOrigins, VERCEL_ORIGIN_REGEX];
}

export function getCorsOptions() {
  const origin = resolveCorsOrigins();

  return {
    origin,
    credentials: origin === true ? false : true,
  };
}
