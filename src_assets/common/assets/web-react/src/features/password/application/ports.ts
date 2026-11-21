import type { PasswordChange } from '@/features/password/domain/password-change';

/** The host credentials endpoint (`POST ./api/password`). */
export interface PasswordPort {
  /** Resolves to the raw JSON of an HTTP 200 answer or of a 400 validation answer; rejects on any other failure. */
  change(data: PasswordChange, signal?: AbortSignal): Promise<unknown>;
}
