const API_BASE_URL = '/api';

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, status: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Common fetch wrapper attaching X-Requested-With header, credentials: 'include',
 * Bearer token fallback, and parsing uniform JSON error responses.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('carecircle_token') : null;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

  if (!response.ok) {
    const errorData = (isJson && data && typeof data === 'object' && 'error' in data) ? (data as { error: { message?: string; code?: string; details?: unknown } }).error : {};
    throw new ApiError(
      errorData.message || (typeof data === 'string' && data.length < 120 ? data : `Request failed with status ${response.status}`),
      response.status,
      errorData.code || 'REQUEST_FAILED',
      errorData.details
    );
  }

  return data as T;
}
