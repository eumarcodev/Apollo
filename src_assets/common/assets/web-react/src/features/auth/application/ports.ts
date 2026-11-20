import type { LoginCredentials, NewCredentials } from '@/features/auth/domain/credentials';
import type { LoginOutcome } from '@/features/auth/domain/login';

/** Result of `POST ./api/password` on the first run. */
export type CreateCredentialsOutcome =
  | { kind: 'saved' }
  | { kind: 'rejected'; error: string }
  /** Any answer other than 200 (and a failed request): the legacy page shows "Internal Server Error". */
  | { kind: 'server-error' };

/** The two public endpoints of the host web server. */
export interface AuthApiPort {
  login(credentials: LoginCredentials): Promise<LoginOutcome>;
  createCredentials(credentials: NewCredentials): Promise<CreateCredentialsOutcome>;
}

/** Raw `localStorage.login` value (legacy "remember password", kept for parity). */
export interface SavedLoginPort {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

/** The parts of `window.location` the auth pages use. */
export interface BrowserPort {
  search(): string;
  hash(): string;
  assign(url: string): void;
  reload(): void;
}
