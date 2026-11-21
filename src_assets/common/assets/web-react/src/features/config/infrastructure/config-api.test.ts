import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '@/shared/infrastructure/http';
import { jsonResponse } from '@/shared/testing';
import { browserEnvironment, createConfigApi } from './config-api';

function setup(response: () => Promise<Response>) {
  const fetch = vi.fn((_input: string, _init?: RequestInit) => response());
  const onUnauthorized = vi.fn();
  const api = createConfigApi(createHttpClient({ fetch, onUnauthorized }));
  return { api, fetch, onUnauthorized };
}

describe('createConfigApi', () => {
  it('loads the raw GET ./api/config body', async () => {
    const { api, fetch } = setup(async () => jsonResponse({ platform: 'linux', port: '47989' }));
    await expect(api.load()).resolves.toEqual({ platform: 'linux', port: '47989' });
    expect(fetch).toHaveBeenCalledWith('./api/config', expect.objectContaining({ method: 'GET' }));
  });

  it('passes the abort signal', async () => {
    const { api, fetch } = setup(async () => jsonResponse({}));
    const controller = new AbortController();
    await api.load(controller.signal);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ signal: controller.signal });
  });

  it('posts the payload as JSON and reports saved on 200', async () => {
    const { api, fetch } = setup(async () => jsonResponse({ status: true }));
    await expect(api.save({ port: 48000 })).resolves.toBe('saved');
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('./api/config');
    expect(init).toMatchObject({ method: 'POST', body: '{"port":48000}' });
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('reports failed, with the server error when there is one', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(setup(async () => jsonResponse({ error: 'bad' }, 400)).api.save({})).resolves.toEqual({
      status: 'failed',
      error: 'bad',
    });
    await expect(setup(async () => jsonResponse({ status: false }, 500)).api.save({})).resolves.toEqual({
      status: 'failed',
    });
    await expect(setup(() => Promise.reject(new TypeError('down'))).api.save({})).resolves.toEqual({
      status: 'failed',
    });
  });

  it('posts ./api/restart with the JSON content type and no body', async () => {
    const { api, fetch } = setup(async () => new Response('', { status: 200 }));
    await expect(api.restart()).resolves.toBe('ok');
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('./api/restart');
    expect(init).toMatchObject({ method: 'POST', body: undefined });
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('treats a 200 with a non-JSON body as ok', async () => {
    await expect(setup(async () => new Response('restarting', { status: 200 })).api.restart()).resolves.toBe('ok');
  });

  it('reports rejected for any other status, without the login redirect', async () => {
    const unauthorized = setup(async () => jsonResponse({}, 401));
    await expect(unauthorized.api.restart()).resolves.toBe('rejected');
    expect(unauthorized.onUnauthorized).not.toHaveBeenCalled();
    await expect(setup(async () => jsonResponse({}, 500)).api.restart()).resolves.toBe('rejected');
  });

  it('reports unreachable when the host drops the connection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(setup(() => Promise.reject(new TypeError('reset'))).api.restart()).resolves.toBe('unreachable');
  });
});

describe('browserEnvironment', () => {
  it('schedules and cancels with the window timers', () => {
    vi.useFakeTimers();
    try {
      const callback = vi.fn();
      const handle = browserEnvironment.setTimeout(callback, 100);
      browserEnvironment.clearTimeout(handle);
      const kept = vi.fn();
      browserEnvironment.setTimeout(kept, 100);
      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
      expect(kept).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reloads the page', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    try {
      browserEnvironment.reload();
      expect(reload).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
