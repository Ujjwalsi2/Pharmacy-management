/**
 * Typed fetch client for the MediTrack API.
 *
 * - Injects the in-memory access token as a Bearer header.
 * - Parses the contract's error envelope (`{ error: { code, message, details } }`)
 *   into a thrown `ApiError`.
 * - On a 401, attempts a single `POST /auth/refresh` (guarded against concurrent
 *   refresh storms via a shared in-flight promise) and retries the original
 *   request once; if that also fails, clears the token and notifies the
 *   registered "unauthorized" handler (the auth layer redirects to /login).
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(shape: ApiErrorShape, status: number) {
    super(shape.message);
    this.name = 'ApiError';
    this.code = shape.code;
    this.status = status;
    this.details = shape.details;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

let accessToken: string | null = null;
let refreshPromise: Promise<{ accessToken: string } | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered once by the auth layer; called when a refresh attempt fails. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let shape: ApiErrorShape = {
    code: 'INTERNAL',
    message: `Request failed with status ${res.status}`,
  };
  try {
    const body = (await res.clone().json()) as { error?: ApiErrorShape };
    if (body?.error) shape = body.error;
  } catch {
    // Response body was not JSON; keep the default message.
  }
  return new ApiError(shape, res.status);
}

function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    // Send both headers so the request survives the public preview proxy,
    // which is known to corrupt the standard Authorization header.
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('x-access-token', accessToken);
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

function refreshAccessToken(): Promise<{ accessToken: string } | null> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return data;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ApiFetchOptions extends RequestInit {
  /** Skip the 401 -> refresh -> retry dance (used by auth endpoints themselves). */
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRetry, ...requestInit } = init;
  let res = await rawFetch(path, requestInit);

  if (res.status === 401 && !skipAuthRetry && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, requestInit);
    } else {
      accessToken = null;
      unauthorizedHandler?.();
      throw await parseErrorResponse(res);
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text.length > 0 ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, init?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, init?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...init, method: 'DELETE' }),
};

/** Serializes a params object into a `?a=1&b=2` query string, skipping nullish values. */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : '';
}
