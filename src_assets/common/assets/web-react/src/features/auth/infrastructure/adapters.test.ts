import { describe, expect, it, vi } from 'vitest';
import { createHttpClient, type FetchLike } from '@/shared/infrastructure/http';
import { jsonResponse } from '@/shared/testing';
import { createAuthApi, createBrowser, createSavedLogin } from './adapters';

function apiWith(response: Response | Error) {
  const fetch = vi.fn<FetchLike>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const onUnauthorized = vi.fn();
  const api = createAuthApi(createHttpClient({ fetch, onUnauthorized }));
  return { api, fetch, onUnauthorized };
}

function sentBody(fetch: ReturnType<typeof vi.fn<FetchLike>>): unknown {
  const init = fetch.mock.calls[0]?.[1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe('createAuthApi.login', () => {
  it('posts username and password to ./api/login as JSON', async () => {
    const { api, fetch } = apiWith(new Response('', { status: 200 }));
    await expect(api.login({ username: 'u', password: 'p' })).resolves.toEqual({ kind: 'ok' });
    expect(fetch.mock.calls[0]?.[0]).toBe('./api/login');
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(sentBody(fetch)).toEqual({ username: 'u', password: 'p' });
  });

  it('ignores a 200 body that is not JSON', async () => {
    const { api } = apiWith(new Response('ok', { status: 200 }));
    await expect(api.login({ username: 'u', password: 'p' })).resolves.toEqual({ kind: 'ok' });
  });

  it('maps 401 without redirecting to the login page', async () => {
    const { api, onUnauthorized } = apiWith(new Response('', { status: 401 }));
    await expect(api.login({ username: 'u', password: 'p' })).resolves.toEqual({ kind: 'unauthorized' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('maps other statuses', async () => {
    const { api } = apiWith(new Response('', { status: 500 }));
    await expect(api.login({ username: 'u', password: 'p' })).resolves.toEqual({ kind: 'http', status: 500 });
  });

  it('maps a failed request to the browser reason', async () => {
    const { api } = apiWith(new TypeError('Failed to fetch'));
    await expect(api.login({ username: 'u', password: 'p' })).resolves.toEqual({
      kind: 'network',
      reason: 'Failed to fetch',
    });
  });
});

describe('createAuthApi.createCredentials', () => {
  const credentials = { newUsername: 'helios', newPassword: 'a', confirmNewPassword: 'a' };

  it('posts exactly the legacy payload to ./api/password', async () => {
    const { api, fetch } = apiWith(jsonResponse({ status: true }));
    await expect(api.createCredentials({ ...credentials, extra: 1 } as never)).resolves.toEqual({ kind: 'saved' });
    expect(fetch.mock.calls[0]?.[0]).toBe('./api/password');
    expect(sentBody(fetch)).toEqual(credentials);
  });

  it('returns the server error of a 200 answer that is not a success', async () => {
    const { api } = apiWith(jsonResponse({ status: false, error: 'Invalid Username' }));
    await expect(api.createCredentials(credentials)).resolves.toEqual({ kind: 'rejected', error: 'Invalid Username' });
  });

  it('shows the server error of a 400 validation answer instead of a generic failure', async () => {
    const { api } = apiWith(jsonResponse({ status: false, error: 'Password Mismatch' }, 400));
    await expect(api.createCredentials(credentials)).resolves.toEqual({ kind: 'rejected', error: 'Password Mismatch' });
  });

  it.each([
    ['400 without an error text', () => jsonResponse({ status: false }, 400)],
    ['400 with a non-JSON body', () => new Response('bad', { status: 400 })],
    ['401', () => new Response('', { status: 401 })],
    ['500', () => new Response('', { status: 500 })],
    ['invalid JSON', () => new Response('<html>', { status: 200 })],
    ['network failure', () => new TypeError('Failed to fetch')],
  ])('maps %s to a server error', async (_name, make) => {
    const { api, onUnauthorized } = apiWith(make());
    await expect(api.createCredentials(credentials)).resolves.toEqual({ kind: 'server-error' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('createSavedLogin', () => {
  it('reads, writes and removes localStorage.login', () => {
    localStorage.clear();
    const store = createSavedLogin();
    expect(store.read()).toBeNull();
    store.write('{"username":"u"}');
    expect(localStorage.getItem('login')).toBe('{"username":"u"}');
    expect(store.read()).toBe('{"username":"u"}');
    store.remove();
    expect(localStorage.getItem('login')).toBeNull();
  });

  it('behaves as an empty store when the storage throws', () => {
    const store = createSavedLogin(() => {
      throw new Error('blocked');
    });
    expect(store.read()).toBeNull();
    expect(() => store.write('x')).not.toThrow();
    expect(() => store.remove()).not.toThrow();
  });
});

describe('createBrowser', () => {
  it('delegates to the location', () => {
    const location = { search: '?redir=./apps', hash: '#x', assign: vi.fn(), reload: vi.fn() };
    const browser = createBrowser(() => location as unknown as Location);
    expect(browser.search()).toBe('?redir=./apps');
    expect(browser.hash()).toBe('#x');
    browser.assign('./apps#x');
    browser.reload();
    expect(location.assign).toHaveBeenCalledWith('./apps#x');
    expect(location.reload).toHaveBeenCalled();
  });

  it('uses window.location by default', () => {
    expect(createBrowser().search()).toBe(window.location.search);
    expect(createBrowser().hash()).toBe(window.location.hash);
  });
});
