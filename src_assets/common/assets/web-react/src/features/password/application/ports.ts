import type { PasswordChange } from '@/features/password/domain/password-change';

/** The host credentials endpoint (`POST ./api/password`). */
export interface PasswordPort {
  /** Resolves to the raw JSON of an HTTP 200 answer; rejects on any other status or on a network error. */
  change(data: PasswordChange, signal?: AbortSignal): Promise<unknown>;
}
