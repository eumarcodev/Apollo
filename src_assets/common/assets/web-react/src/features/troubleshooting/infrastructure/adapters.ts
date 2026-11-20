import type { LogsPort, MaintenancePort } from '@/features/troubleshooting/application/ports';
import { decodeLogBody } from '@/features/troubleshooting/domain/log-text';
import { httpClient, redirectToLogin, type FetchLike, type HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';

interface StatusDto {
  status?: unknown;
}

export function createMaintenance(http: HttpClient = httpClient): MaintenancePort {
  return {
    async closeApps() {
      const answer = await http.postJson<StatusDto>('./api/apps/close', {});
      return answer?.status === true;
    },
    async restart() {
      try {
        await http.postJson('./api/restart', {});
        return 'accepted';
      } catch (error) {
        const failure = AppError.from(error);
        if (failure.kind === 'network') {
          return 'unreachable';
        }
        // A 200 whose body is not JSON is still an accepted restart.
        return failure.kind === 'parse' ? 'accepted' : 'rejected';
      }
    },
    async quit() {
      try {
        await http.postJson('./api/quit', {}, { redirectOnUnauthorized: false });
        return 'answered';
      } catch (error) {
        // Only a request that fails to reach the host means the host went away.
        return AppError.from(error).kind === 'network' ? 'unreachable' : 'answered';
      }
    },
    async resetDisplayPersistence() {
      const answer = await http.postJson<StatusDto>('./api/reset-display-device-persistence', {});
      return answer?.status === true;
    },
  };
}

/**
 * The host log. A plain fetch on purpose: the body must be decoded with the charset of the `Content-Type` header
 * (the host writes the log in the Windows code page), which the shared client does not do.
 */
export function createLogsReader(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
  onUnauthorized: () => void = redirectToLogin,
): LogsPort {
  return {
    async readLogs(signal) {
      let response: Response;
      try {
        response = await fetchImpl('./api/logs', { credentials: 'include', ...(signal ? { signal } : {}) });
      } catch (cause) {
        throw new AppError('network', 'Request to ./api/logs failed', { cause });
      }
      if (response.status === 401) {
        onUnauthorized();
        throw new AppError('unauthorized', 'Unauthorized', { status: 401 });
      }
      if (!response.ok) {
        throw new AppError('http', `Server returned ${response.status}`, { status: response.status });
      }
      const body = await response.arrayBuffer();
      try {
        return decodeLogBody(body, response.headers.get('Content-Type'));
      } catch (cause) {
        throw new AppError('parse', 'Unsupported log charset', { cause });
      }
    },
  };
}
