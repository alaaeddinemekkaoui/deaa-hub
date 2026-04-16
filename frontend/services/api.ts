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

export async function fetchRef<T>(url: string, ttlMs = 5 * 60 * 1000): Promise<T> {
  const hit = REF_CACHE.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;
  const r = await api.get<T>(url);
  REF_CACHE.set(url, { data: r.data, ts: Date.now() });
  return r.data;
}

export function invalidateRef(url: string): void {
  REF_CACHE.delete(url);
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
