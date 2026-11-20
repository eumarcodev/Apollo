/** Username proposed on the first-run page (legacy welcome.html default). */
export const DEFAULT_WELCOME_USERNAME = 'helios';

/** Body of `POST ./api/password` on the first run (no current credentials exist yet). */
export interface NewCredentials {
  newUsername: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Body of `POST ./api/login`. */
export interface LoginCredentials {
  username: string;
  password: string;
}

export type NewCredentialsIssue = 'password-mismatch';

/** The only client-side check of the legacy page: password and confirmation must be identical. */
export function validateNewCredentials(credentials: NewCredentials): NewCredentialsIssue | null {
  return credentials.newPassword === credentials.confirmNewPassword ? null : 'password-mismatch';
}

export type PasswordSaveResult = { saved: true } | { saved: false; error: string };

/**
 * Meaning of a 200 answer of `POST ./api/password` (`{ status, error }`): only `status === true` is a success;
 * otherwise the server `error` text is shown as is (empty when the server sent none, as the legacy page did).
 */
export function interpretPasswordResponse(body: unknown): PasswordSaveResult {
  if (body !== null && typeof body === 'object' && 'status' in body && body.status === true) {
    return { saved: true };
  }
  const error =
    body !== null && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : '';
  return { saved: false, error };
}
