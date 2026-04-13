type CorsOrigin = boolean | string[];

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

  return parseCorsOrigins(corsOriginConfig);
}

export function getCorsOptions() {
  const origin = resolveCorsOrigins();

  return {
    origin,
    credentials: origin === true ? false : true,
  };
}

