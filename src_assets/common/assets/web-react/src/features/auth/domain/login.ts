import type { LoginCredentials } from './credentials';

/**
 * Where to go after a successful login. Only a relative `redir` (starting with `.`, the format the server writes:
 * `/login?redir=./config`) is followed; anything else goes to the home page. This guard prevents open redirects
 * (`?redir=https://evil.example`, `?redir=//evil.example`). The current hash is kept in both cases.
 */
export function resolveLoginRedirect(redir: string | null, hash: string): string {
  if (redir && redir.startsWith('.')) {
    return redir + hash;
  }
  return `./${hash}`;
}

/** `redir` query parameter of a location search string (`?redir=./config`), or null. */
export function readRedirectParam(search: string): string | null {
  return new URLSearchParams(search).get('redir');
}

/**
 * Credentials remembered under `localStorage.login` (legacy format `{ "username", "password" }`, kept for parity).
 * Null when nothing is stored or the value is not valid JSON; missing fields become empty strings.
 */
export function parseSavedLogin(raw: string | null): LoginCredentials | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  return {
    username: typeof record['username'] === 'string' ? record['username'] : '',
    password: typeof record['password'] === 'string' ? record['password'] : '',
  };
}

export function serializeSavedLogin(credentials: LoginCredentials): string {
  return JSON.stringify({ username: credentials.username, password: credentials.password });
}

/** Result of `POST ./api/login`. */
export type LoginOutcome =
  { kind: 'ok' } | { kind: 'unauthorized' } | { kind: 'http'; status: number } | { kind: 'network'; reason: string };
