import { useAuthStore } from '../store/auth-store';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  signal?: AbortSignal;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  const isHtml =
    contentType.includes('text/html') ||
    text.trim().startsWith('<!doctype') ||
    text.trim().startsWith('<!DOCTYPE') ||
    text.trim().startsWith('<html');

  if (isHtml) {
    throw new ApiError(response.status, `Server returned HTML instead of JSON for ${endpoint}`);
  }

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(response.status, `Invalid JSON response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP error ${response.status}`;
    const apiError = new ApiError(response.status, message, data);
    if (response.status === 401) {
      console.warn('Unauthorized: Session expired or invalid token.');
    }
    throw apiError;
  }

  return data as T;
}
