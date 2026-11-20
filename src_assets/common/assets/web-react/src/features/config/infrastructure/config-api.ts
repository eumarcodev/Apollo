import type { ConfigPort, PageEnvironment } from '@/features/config/application/ports';
import { AppError } from '@/shared/kernel';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';
import type { ServerConfigDto } from '@/shared/infrastructure/server-config';

/** `GET/POST ./api/config` and `POST ./api/restart` (getConfig, saveConfig and restart in src/confighttp.cpp). */
export function createConfigApi(http: HttpClient = httpClient): ConfigPort {
  return {
    load: (signal) => http.getJson<ServerConfigDto>('./api/config', signal ? { signal } : {}),

    async save(payload) {
      try {
        await http.postJson('./api/config', payload);
        return 'saved';
      } catch (error) {
        // The legacy page ignores a failed save (no message, the success alert stays hidden).
        console.error(error);
        return 'failed';
      }
    },

    async restart() {
      try {
        // restart() validates the JSON content type and never answers in practice: the host goes down.
        await http.postJson('./api/restart', undefined, { redirectOnUnauthorized: false });
        return 'ok';
      } catch (error) {
        const appError = AppError.from(error);
        if (appError.kind === 'parse') {
          // A 200 with a body that is not JSON is still a 200.
          return 'ok';
        }
        if (appError.kind === 'network') {
          console.error(appError);
          return 'unreachable';
        }
        return 'rejected';
      }
    },
  };
}

export const browserEnvironment: PageEnvironment = {
  reload: () => window.location.reload(),
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
};
