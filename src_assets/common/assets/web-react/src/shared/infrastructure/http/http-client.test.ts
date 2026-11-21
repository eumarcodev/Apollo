import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/kernel';
import { jsonResponse } from '@/shared/testing';
import { buildLoginRedirect, createHttpClient, redirectToLogin } from './http-client';

describe('buildLoginRedirect', () => {
  it('uses the server redirect format and keeps the hash', () => {
    expect(buildLoginRedirect({ pathname: '/config', hash: '#av' })).toBe('./login?redir=.%2Fconfig#av');
    expect(buildLoginRedirect({ pathname: '/', hash: '' })).toBe('./login?redir=.%2F');
  });

  it('never redirects from the public pages', () => {
    expect(buildLoginRedirect({ pathname: '/login', hash: '' })).toBeNull();
    expect(buildLoginRedirect({ pathname: '/login/', hash: '' })).toBeNull();
    expect(buildLoginRedirect({ pathname: '/welcome', hash: '' })).toBeNull();
  });

  it('redirectToLogin navigates the window', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ pathname: '/apps', hash: '', assign } as unknown as Location);
    redirectToLogin();
    expect(assign).toHaveBeenCalledWith('./login?redir=.%2Fapps');
  });

  it('redirectToLogin does nothing on the login page', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      pathname: '/login',
      hash: '',
      assign,
    } as unknown as Location);
    redirectToLogin();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('createHttpClient', () => {
  it('GETs JSON with credentials', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: true, locale: 'en' }));
    const http = createHttpClient({ fetch });
    await expect(http.getJson('./api/configLocale')).resolves.toEqual({ status: true, locale: 'en' });
    expect(fetch).toHaveBeenCalledWith(
      './api/configLocale',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('POSTs JSON with the content type the server requires', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: true }));
    const http = createHttpClient({ fetch });
    await expect(http.postJson('./api/config', { a: '1' })).resolves.toEqual({ status: true });
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":"1"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('returns undefined for an empty POST response (login)', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    await expect(createHttpClient({ fetch }).postJson('./api/login', {})).resolves.toBeUndefined();
  });

  it('passes the abort signal', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('log text'));
    const controller = new AbortController();
    await expect(createHttpClient({ fetch }).getText('./api/logs', { signal: controller.signal })).resolves.toBe(
      'log text',
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });

  it('turns network failures into AppError("network")', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    await expect(createHttpClient({ fetch }).getJson('./api/apps')).rejects.toMatchObject({ kind: 'network' });
  });

  it('calls onUnauthorized on 401 and throws', async () => {
    const onUnauthorized = vi.fn();
    const fetch = vi
      .fn()
      .mockImplementation(async () => jsonResponse({ status_code: 401, error: 'Unauthorized' }, 401));
    const http = createHttpClient({ fetch, onUnauthorized });
    await expect(http.getJson('./api/apps')).rejects.toMatchObject({ kind: 'unauthorized', status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    await expect(http.getJson('./api/apps', { redirectOnUnauthorized: false })).rejects.toBeInstanceOf(AppError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('uses the server error message for other failures', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: false, error: 'Content type mismatch' }, 400));
    await expect(createHttpClient({ fetch }).postJson('./api/config', {})).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      message: 'Content type mismatch',
    });
  });

  it('keeps a non-JSON error body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('oops', { status: 500 }));
    await expect(createHttpClient({ fetch }).getText('./api/logs')).rejects.toMatchObject({
      kind: 'http',
      message: 'Server returned 500',
      body: 'oops',
    });
  });

  it('reports invalid JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('not json'));
    await expect(createHttpClient({ fetch }).getJson('./api/apps')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('uses the global fetch by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: 1 }));
    await expect(createHttpClient().getJson('./x')).resolves.toEqual({ ok: 1 });
    expect(spy).toHaveBeenCalledOnce();
  });
});
