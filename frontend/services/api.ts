import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

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
