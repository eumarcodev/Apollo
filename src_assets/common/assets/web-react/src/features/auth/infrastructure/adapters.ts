import type { AuthApiPort, BrowserPort, SavedLoginPort } from '@/features/auth/application/ports';
import { interpretPasswordResponse } from '@/features/auth/domain/credentials';
import { AppError } from '@/shared/kernel';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';

function reasonOf(error: AppError): string {
  return error.cause instanceof Error ? error.cause.message : error.message;
}

/**
 * `POST ./api/login` and `POST ./api/password`. A 401 here is an answer for the form, never a reason to send the
 * browser to the login page, so the client redirect is turned off.
 */
export function createAuthApi(http: HttpClient = httpClient): AuthApiPort {
  return {
    async login(credentials) {
      try {
        await http.postJson(
          './api/login',
          { username: credentials.username, password: credentials.password },
          { redirectOnUnauthorized: false },
        );
        return { kind: 'ok' };
      } catch (cause) {
        const error = AppError.from(cause);
        switch (error.kind) {
          case 'unauthorized':
            return { kind: 'unauthorized' };
          case 'http':
            return { kind: 'http', status: error.status ?? 0 };
          // The legacy page never reads the body of a 200 answer (the server sends none).
          case 'parse':
            return { kind: 'ok' };
          default:
            return { kind: 'network', reason: reasonOf(error) };
        }
      }
    },
    async createCredentials(credentials) {
      let body: unknown;
      try {
        body = await http.postJson(
          './api/password',
          {
            newUsername: credentials.newUsername,
            newPassword: credentials.newPassword,
            confirmNewPassword: credentials.confirmNewPassword,
          },
          { redirectOnUnauthorized: false },
        );
      } catch (cause) {
        // A 400 carries the validation error of the server (`{ status: false, error }`): show it, not a generic failure.
        const error = AppError.from(cause);
        const reason = error.body;
        if (
          error.kind === 'http' &&
          error.status === 400 &&
          reason &&
          typeof reason === 'object' &&
          'error' in reason &&
          typeof reason.error === 'string'
        ) {
          return { kind: 'rejected', error: reason.error };
        }
        return { kind: 'server-error' };
      }
      const result = interpretPasswordResponse(body);
      return result.saved ? { kind: 'saved' } : { kind: 'rejected', error: result.error };
    },
  };
}

/** `localStorage.login`; storage failures (private mode, blocked site data) behave as an empty store. */
export function createSavedLogin(storage: () => Storage = () => window.localStorage): SavedLoginPort {
  return {
    read() {
      try {
        return storage().getItem('login');
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        storage().setItem('login', value);
      } catch {
        // nothing to remember when the storage is unavailable
      }
    },
    remove() {
      try {
        storage().removeItem('login');
      } catch {
        // nothing stored when the storage is unavailable
      }
    },
  };
}

export function createBrowser(location: () => Location = () => window.location): BrowserPort {
  return {
    search: () => location().search,
    hash: () => location().hash,
    assign: (url) => location().assign(url),
    reload: () => location().reload(),
  };
}
