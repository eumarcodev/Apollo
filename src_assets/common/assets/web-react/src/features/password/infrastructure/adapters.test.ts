import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '@/shared/infrastructure/http';
import { jsonResponse } from '@/shared/testing';
import { createPasswordApi } from './adapters';

const FORM = {
  currentUsername: 'x',
  currentPassword: 'old',
  newUsername: 'y',
  newPassword: 'new',
  confirmNewPassword: 'new',
};

describe('createPasswordApi', () => {
  it('posts the five fields as JSON to ./api/password and returns the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: true }));
    const api = createPasswordApi(createHttpClient({ fetch: fetchMock }));
    await expect(api.change(FORM)).resolves.toEqual({ status: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('./api/password');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual(FORM);
  });

  it('rejects on a non-200 answer, passing the abort signal along', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: false, error: 'Invalid' }, 400));
    const api = createPasswordApi(createHttpClient({ fetch: fetchMock }));
    const controller = new AbortController();
    await expect(api.change(FORM, controller.signal)).rejects.toMatchObject({ kind: 'http', status: 400 });
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].signal).toBe(controller.signal);
  });
});
