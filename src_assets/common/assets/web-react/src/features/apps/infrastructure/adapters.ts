import type { ActionResult, AppsPort } from '@/features/apps/application/ports';
import { parseAppsListing } from '@/features/apps/domain/app-list';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';

/** The host answers a failed action with HTTP 400 and `{ status: false, error }`; the page shows `error`. */
async function action(http: HttpClient, path: string, body: unknown): Promise<ActionResult> {
  try {
    const response = await http.postJson<{ status?: unknown; error?: unknown }>(path, body);
    return {
      status: response?.status === true,
      ...(typeof response?.error === 'string' ? { error: response.error } : {}),
    };
  } catch (cause) {
    const error = AppError.from(cause);
    if (error.kind === 'http' || error.kind === 'parse') {
      return { status: false, error: error.message };
    }
    throw error;
  }
}

export function createAppsPort(http: HttpClient = httpClient): AppsPort {
  return {
    async list(signal) {
      return parseAppsListing(await http.getJson<unknown>('./api/apps', signal ? { signal } : {}));
    },
    reorder: (order) => action(http, './api/apps/reorder', { order }),
    launch: (uuid) => action(http, './api/apps/launch', { uuid }),
    close: () => action(http, './api/apps/close', undefined),
    remove: (uuid) => action(http, './api/apps/delete', { uuid }),
    save: (app) => action(http, './api/apps', app),
  };
}
