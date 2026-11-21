/** The five fields `POST ./api/password` expects (names are the wire format). */
export interface PasswordChange {
  currentUsername: string;
  currentPassword: string;
  newUsername: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** The page reloads this long after a successful change, so the browser asks for the new credentials. */
export const RELOAD_DELAY_MS = 5000;

export function emptyPasswordChange(): PasswordChange {
  return { currentUsername: '', currentPassword: '', newUsername: '', newPassword: '', confirmNewPassword: '' };
}

/** True when the new password and its confirmation differ (checked before any request, as the legacy page does). */
export function hasPasswordMismatch(form: PasswordChange): boolean {
  return form.newPassword !== form.confirmNewPassword;
}

/** What the page shows after a submit. `rejected` carries the server's own message, `failed` any non-200 answer. */
export type PasswordOutcome =
  { kind: 'mismatch' } | { kind: 'success' } | { kind: 'rejected'; message: string } | { kind: 'failed' };

/** Reads the JSON the server answers with on HTTP 200: `{ status, error }`; only `status === true` is a success. */
export function interpretPasswordResponse(body: unknown): PasswordOutcome {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (record['status'] === true) {
    return { kind: 'success' };
  }
  const error = record['error'];
  return { kind: 'rejected', message: typeof error === 'string' ? error : '' };
}
