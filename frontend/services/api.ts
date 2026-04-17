import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { getMockResponse } from './mock-data';

type ApiErrorPayload = {
  message?: string | string[];
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

let lastNetworkToastAt = 0;
const NETWORK_TOAST_COOLDOWN_MS = 5000;

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('deaa_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (typeof window !== 'undefined') {
      const isNetworkError =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error';

      if (isNetworkError) {
        // Try to serve mock/demo data before showing an error
        const mockData = getMockResponse(
          error.config?.url ?? '',
          error.config?.params as Record<string, unknown> | undefined,
          error.config?.method,
        );
        if (mockData !== null) {
          const now = Date.now();
          if (now - lastNetworkToastAt > NETWORK_TOAST_COOLDOWN_MS) {
            lastNetworkToastAt = now;
            toast.info('Mode démo — données fictives affichées (backend hors ligne)');
          }
          return Promise.resolve({ data: mockData, status: 200, statusText: 'OK (Demo)', headers: {}, config: error.config! });
        }

        const now = Date.now();
        if (now - lastNetworkToastAt > NETWORK_TOAST_COOLDOWN_MS) {
          lastNetworkToastAt = now;
          toast.error('API unavailable. Please make sure backend server is running.');
        }
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Session-level reference-data cache
// Avoids re-fetching rarely-changing lookups (departments, cycles, options…)
// on every page mount. TTL defaults to 5 minutes.
// ---------------------------------------------------------------------------
const REF_CACHE = new Map<string, { data: unknown; ts: number }>();
const REF_STORAGE_KEY = 'deaa_ref_cache_v1';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readPersistedRefCache(): Record<string, { data: unknown; ts: number }> {
  if (!canUseSessionStorage()) {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { data: unknown; ts: number }>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistedRefCache(entries: Map<string, { data: unknown; ts: number }>): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    const serialized = Object.fromEntries(entries);
    window.sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage quota and serialization issues; in-memory cache still works.
  }
}

function getPersistedRef<T>(url: string, ttlMs: number): T | undefined {
  const stored = readPersistedRefCache()[url];
  if (!stored) return undefined;
  if (Date.now() - stored.ts >= ttlMs) return undefined;
  return stored.data as T;
}

function persistRef(url: string, data: unknown, ts: number): void {
  if (!canUseSessionStorage()) {
    return;
  }

  const persisted = readPersistedRefCache();
  persisted[url] = { data, ts };

  try {
    window.sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore storage quota and serialization issues; in-memory cache still works.
  }
}

function removePersistedRef(url: string): void {
  if (!canUseSessionStorage()) {
    return;
  }

  const persisted = readPersistedRefCache();
  if (!(url in persisted)) {
    return;
  }
  delete persisted[url];

  try {
    window.sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore storage quota and serialization issues.
  }
}

function buildCacheUrl(
  url: string,
  params?: Record<string, unknown>,
): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
}

export async function fetchRef<T>(url: string, ttlMs = 5 * 60 * 1000): Promise<T> {
  const hit = REF_CACHE.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;

  const persisted = getPersistedRef<T>(url, ttlMs);
  if (persisted !== undefined) {
    REF_CACHE.set(url, { data: persisted, ts: Date.now() });
    return persisted;
  }

  const r = await api.get<T>(url);
  const ts = Date.now();
  REF_CACHE.set(url, { data: r.data, ts });
  persistRef(url, r.data, ts);
  return r.data;
}

export async function fetchCollectionRef<T>(
  url: string,
  params?: Record<string, unknown>,
  ttlMs = 5 * 60 * 1000,
): Promise<T[]> {
  const cacheUrl = buildCacheUrl(url, params);
  const data = await fetchRef<PaginatedResponse<T> | T[]>(cacheUrl, ttlMs);
  return Array.isArray(data) ? data : data.data;
}

export function invalidateRef(url: string): void {
  REF_CACHE.delete(url);
  removePersistedRef(url);
}

export function clearRefCache(): void {
  REF_CACHE.clear();
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // Ignore storage issues.
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong.',
) {
  const message = (error as AxiosError<ApiErrorPayload> | undefined)?.response?.data
    ?.message;

  if (Array.isArray(message) && message.length > 0) {
    return message.join(', ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
