import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';
import { jsonResponse } from '@/shared/testing';
import {
  createBrowserEnvironment,
  createPairingApi,
  createSessionHostStore,
  HOST_INFO_KEY,
  toOtpAnswer,
} from './adapters';

function apiWith(response: Response | Error) {
  const fetch = vi.fn((_input: string, _init?: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const onUnauthorized = vi.fn();
  return { api: createPairingApi(createHttpClient({ fetch, onUnauthorized })), fetch, onUnauthorized };
}

describe('pairing API', () => {
  it('posts the PIN and the device name as JSON to ./api/pin', async () => {
    const { api, fetch } = apiWith(jsonResponse({ status: true }));
    await expect(api.sendPin({ pin: '1234', name: 'Tablet' })).resolves.toBe(true);
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('./api/pin');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual({ pin: '1234', name: 'Tablet' });
  });

  it('reports a refused PIN, also when the host answers 400', async () => {
    expect(await apiWith(jsonResponse({ status: false })).api.sendPin({ pin: '1', name: '' })).toBe(false);
    expect(
      await apiWith(jsonResponse({ status_code: 400, status: false, error: 'bad' }, 400)).api.sendPin({
        pin: '1',
        name: '',
      }),
    ).toBe(false);
    expect(await apiWith(jsonResponse({ status: 'true' })).api.sendPin({ pin: '1', name: '' })).toBe(false);
  });

  it('lets network errors and 401 through', async () => {
    await expect(apiWith(new TypeError('offline')).api.sendPin({ pin: '1', name: '' })).rejects.toBeInstanceOf(
      AppError,
    );
    const unauthorized = apiWith(jsonResponse({ status: false, error: 'Unauthorized' }, 401));
    await expect(unauthorized.api.requestOtp({ passphrase: 'abcd', deviceName: '' })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    expect(unauthorized.onUnauthorized).toHaveBeenCalled();
    await expect(
      apiWith(new Response('oops', { status: 500 })).api.requestOtp({ passphrase: 'abcd', deviceName: '' }),
    ).rejects.toMatchObject({ kind: 'http' });
  });

  it('posts the passphrase and the device name to ./api/otp and maps the OTP', async () => {
    const { api, fetch } = apiWith(
      jsonResponse({ status: true, otp: '4321', ip: '10.0.0.5', name: 'Helios PC', message: 'OTP created' }),
    );
    await expect(api.requestOtp({ passphrase: 'abcd', deviceName: 'Tablet' })).resolves.toEqual({
      ok: true,
      otp: '4321',
      ip: '10.0.0.5',
      hostName: 'Helios PC',
    });
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('./api/otp');
    expect(JSON.parse(init?.body as string)).toEqual({ passphrase: 'abcd', deviceName: 'Tablet' });
  });

  it('reads the refusal from `error` of a 400, falling back to `message`', async () => {
    expect(
      await apiWith(jsonResponse({ status: false, message: 'Too many' })).api.requestOtp({
        passphrase: 'abcd',
        deviceName: '',
      }),
    ).toEqual({ ok: false, message: 'Too many' });
    expect(
      await apiWith(
        jsonResponse({ status_code: 400, status: false, error: 'Passphrase too short!' }, 400),
      ).api.requestOtp({ passphrase: 'ab', deviceName: '' }),
    ).toEqual({ ok: false, message: 'Passphrase too short!' });
  });

  it('maps missing or odd OTP fields to text', () => {
    expect(toOtpAnswer(undefined)).toEqual({ ok: false });
    expect(toOtpAnswer({ status: false, message: '' })).toEqual({ ok: false });
    expect(toOtpAnswer({ status: true, otp: 1234, ip: null })).toEqual({ ok: true, otp: '1234', ip: '', hostName: '' });
  });
});

describe('session host store', () => {
  it('reads and writes sessionStorage.hostInfo', () => {
    sessionStorage.removeItem(HOST_INFO_KEY);
    const store = createSessionHostStore();
    expect(store.load()).toBeNull();
    store.save({ hostAddr: 'pc.lan', hostPort: '47989' });
    expect(sessionStorage.getItem(HOST_INFO_KEY)).toBe('{"hostAddr":"pc.lan","hostPort":"47989"}');
    expect(store.load()).toEqual({ hostAddr: 'pc.lan', hostPort: '47989' });
    sessionStorage.removeItem(HOST_INFO_KEY);
  });

  it('behaves as empty when the storage is blocked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const blocked = createSessionHostStore(() => {
      throw new Error('SecurityError');
    });
    expect(blocked.load()).toBeNull();
    expect(() => blocked.save({ hostAddr: 'a', hostPort: '1' })).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('browser environment', () => {
  it('reads the location and opens links in a new window', () => {
    const open = vi.fn();
    const location = { hostname: 'helios.lan', port: '47990', hash: '#PIN' };
    const env = createBrowserEnvironment({ location, open } as unknown as Window);
    expect(env.hostname()).toBe('helios.lan');
    expect(env.port()).toBe('47990');
    expect(env.hash()).toBe('#PIN');
    env.setHash('OTP');
    expect(location.hash).toBe('OTP');
    env.openLink('art://pc:1?pin=1');
    expect(open).toHaveBeenCalledWith('art://pc:1?pin=1');
  });
});
