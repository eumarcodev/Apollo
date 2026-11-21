import { AppError } from '@/shared/kernel';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface LocationLike {
  pathname: string;
  hash: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** Redirect to the login page on 401 (default true). */
  redirectOnUnauthorized?: boolean;
}

export interface HttpClient {
  getJson<T>(path: string, options?: RequestOptions): Promise<T>;
  getText(path: string, options?: RequestOptions): Promise<string>;
  /** POST a JSON body. Resolves to the parsed JSON response, or undefined when the body is empty. */
  postJson<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<T | undefined>;
}

export interface HttpClientDeps {
  fetch?: FetchLike;
  onUnauthorized?: () => void;
}

const PUBLIC_PAGES = new Set(['/login', '/welcome']);

/**
 * Login URL for a session that expired on the current page, in the format the server itself uses
 * (`/login?redir=./config`). Null on the public pages, which must never redirect to themselves.
 */
export function buildLoginRedirect(location: LocationLike): string | null {
  const path = location.pathname.length > 1 ? location.pathname.replace(/\/$/, '') : location.pathname;
  if (PUBLIC_PAGES.has(path)) {
    return null;
  }
  return `./login?redir=${encodeURIComponent(`.${location.pathname}`)}${location.hash}`;
}

export function redirectToLogin(): void {
  const target = buildLoginRedirect(window.location);
  if (target) {
    window.location.assign(target);
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return `Server returned ${status}`;
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new AppError('parse', `Invalid JSON from ${path}`, { cause });
  }
}

export function createHttpClient(deps: HttpClientDeps = {}): HttpClient {
  const fetchImpl: FetchLike = deps.fetch ?? ((input, init) => fetch(input, init));
  const onUnauthorized = deps.onUnauthorized ?? redirectToLogin;

  async function send(path: string, init: RequestInit, options: RequestOptions = {}): Promise<string> {
    let response: Response;
    try {
      response = await fetchImpl(path, {
        ...init,
        credentials: 'include',
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (cause) {
      throw new AppError('network', `Request to ${path} failed`, { cause });
    }
    const text = await response.text();
    if (response.status === 401) {
      if (options.redirectOnUnauthorized !== false) {
        onUnauthorized();
      }
      throw new AppError('unauthorized', 'Unauthorized', { status: 401 });
    }
    if (!response.ok) {
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        // keep the raw text as the error body
      }
      throw new AppError('http', errorMessage(body, response.status), {
        status: response.status,
        body,
      });
    }
    return text;
  }

  return {
    async getJson<T>(path: string, options?: RequestOptions): Promise<T> {
      const text = await send(path, { method: 'GET', headers: { Accept: 'application/json' } }, options);
      return parseJson(text, path) as T;
    },
    async getText(path: string, options?: RequestOptions): Promise<string> {
      return send(path, { method: 'GET' }, options);
    },
    async postJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T | undefined> {
      const text = await send(
        path,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        },
        options,
      );
      return text ? (parseJson(text, path) as T) : undefined;
    },
  };
}

/** Default client used by the adapters (relative paths, as the pages are served from the host root). */
export const httpClient: HttpClient = createHttpClient();
