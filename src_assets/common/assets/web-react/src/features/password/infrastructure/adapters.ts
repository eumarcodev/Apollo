import type { PasswordPort } from '@/features/password/application/ports';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';

/**
 * The server answers a validation failure (`Password Mismatch`, `Invalid Username`, `Invalid Current Credentials`)
 * with HTTP 400 and `{ status: false, error }`. That body is an answer for the form, so it is returned like a 200 one.
 */
function validationBody(cause: unknown): unknown {
  const error = AppError.from(cause);
  const body = error.body;
  if (
    error.kind === 'http' &&
    error.status === 400 &&
    body &&
    typeof body === 'object' &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return { status: false, error: body.error };
  }
  return undefined;
}

export function createPasswordApi(http: HttpClient = httpClient): PasswordPort {
  return {
    async change(data, signal) {
      try {
        return await http.postJson('./api/password', data, signal ? { signal } : {});
      } catch (cause) {
        const body = validationBody(cause);
        if (body === undefined) {
          throw cause;
        }
        return body;
      }
    },
  };
}
