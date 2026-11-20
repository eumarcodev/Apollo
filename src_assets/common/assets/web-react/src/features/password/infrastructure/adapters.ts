import type { PasswordPort } from '@/features/password/application/ports';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';

export function createPasswordApi(http: HttpClient = httpClient): PasswordPort {
  return {
    change: (data, signal) => http.postJson('./api/password', data, signal ? { signal } : {}),
  };
}
