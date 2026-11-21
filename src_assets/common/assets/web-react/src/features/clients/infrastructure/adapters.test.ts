import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';
import { jsonResponse } from '@/shared/testing';
import { createClientsApi, toPairedClient, toPairedClients } from './adapters';

function apiWith(response: Response | Error) {
  const fetch = vi.fn((_input: string, _init?: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const onUnauthorized = vi.fn();
  return { api: createClientsApi(createHttpClient({ fetch, onUnauthorized })), fetch, onUnauthorized };
}

const CERT = {
  name: 'Tablet',
  uuid: 'u-1',
  display_mode: '1920x1080x60',
  perm: '50331648',
  connected: true,
  do: [{ cmd: 'echo up', elevated: false }],
  undo: [{ cmd: 'echo down', elevated: 'true' }],
  allow_client_commands: true,
  enable_legacy_ordering: false,
  always_use_virtual_display: true,
};

describe('list mapping', () => {
  it('maps a host entry, parsing perm from a string', () => {
    expect(toPairedClient(CERT)).toEqual({
      uuid: 'u-1',
      name: 'Tablet',
      displayMode: '1920x1080x60',
      perm: 0x03000000,
      connected: true,
      doCmds: [{ cmd: 'echo up', elevated: false }],
      undoCmds: [{ cmd: 'echo down', elevated: 'true' }],
      allowClientCommands: true,
      enableLegacyOrdering: false,
      alwaysUseVirtualDisplay: true,
    });
  });

  it('uses safe values for fields the host left out', () => {
    expect(toPairedClient({ uuid: 'u-2' })).toEqual({
      uuid: 'u-2',
      name: '',
      displayMode: '',
      perm: 0,
      connected: false,
      doCmds: [],
      undoCmds: [],
      allowClientCommands: true,
      enableLegacyOrdering: true,
      alwaysUseVirtualDisplay: false,
    });
    expect(toPairedClient({ do: [null, { cmd: 'x' }] }).doCmds).toEqual([
      { cmd: '', elevated: false },
      { cmd: 'x', elevated: false },
    ]);
  });

  it('is empty for status false, a missing list or no devices', () => {
    expect(toPairedClients(undefined)).toEqual([]);
    expect(toPairedClients({ status: false, named_certs: [CERT] })).toEqual([]);
    expect(toPairedClients({ status: true })).toEqual([]);
    expect(toPairedClients({ status: true, named_certs: [] })).toEqual([]);
    expect(toPairedClients({ status: true, named_certs: [CERT] })).toHaveLength(1);
  });
});

describe('clients API', () => {
  it('reads the list from ./api/clients/list', async () => {
    const { api, fetch } = apiWith(jsonResponse({ status: true, platform: 'windows', named_certs: [CERT] }));
    const list = await api.list();
    expect(list.map((client) => client.uuid)).toEqual(['u-1']);
    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('./api/clients/list');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('include');
  });

  it('treats an error answer with a JSON body as an empty list, not as a failure', async () => {
    const { api } = apiWith(jsonResponse({ status: false, error: 'not stubbed' }, 501));
    await expect(api.list()).resolves.toEqual([]);
  });

  it('lets network errors, 401 and invalid JSON through', async () => {
    await expect(apiWith(new TypeError('offline')).api.list()).rejects.toBeInstanceOf(AppError);
    const unauthorized = apiWith(jsonResponse({ status: false, error: 'Unauthorized' }, 401));
    await expect(unauthorized.api.list()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(unauthorized.onUnauthorized).toHaveBeenCalled();
    await expect(apiWith(new Response('<html>', { status: 200 })).api.list()).rejects.toMatchObject({
      kind: 'parse',
    });
  });

  it('posts the update body as JSON and reports the status', async () => {
    const payload = {
      uuid: 'u-1',
      name: 'Tablet',
      display_mode: '',
      allow_client_commands: true,
      enable_legacy_ordering: true,
      always_use_virtual_display: false,
      perm: 0x03000000,
      do: [],
      undo: [],
    };
    const ok = apiWith(jsonResponse({ status: true }));
    await expect(ok.api.update(payload)).resolves.toEqual({ ok: true });
    const [path, init] = ok.fetch.mock.calls[0]!;
    expect(path).toBe('./api/clients/update');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual(payload);

    await expect(apiWith(jsonResponse({ status: false })).api.update(payload)).resolves.toEqual({ ok: false });
    await expect(apiWith(jsonResponse({ status: false, message: 'denied' })).api.update(payload)).resolves.toEqual({
      ok: false,
      message: 'denied',
    });
    await expect(
      apiWith(jsonResponse({ status_code: 400, status: false, error: 'bad json' }, 400)).api.update(payload),
    ).resolves.toEqual({ ok: false, message: 'bad json' });
    await expect(apiWith(new TypeError('offline')).api.update(payload)).rejects.toBeInstanceOf(AppError);
  });

  it('posts the uuid to disconnect and unpair', async () => {
    const disconnect = apiWith(jsonResponse({ status: true }));
    await disconnect.api.disconnect('u-1');
    expect(disconnect.fetch.mock.calls[0]![0]).toBe('./api/clients/disconnect');
    expect(JSON.parse(disconnect.fetch.mock.calls[0]![1]?.body as string)).toEqual({ uuid: 'u-1' });

    const unpair = apiWith(jsonResponse({ status: true }));
    await unpair.api.unpair('u-1');
    expect(unpair.fetch.mock.calls[0]![0]).toBe('./api/clients/unpair');
    expect(JSON.parse(unpair.fetch.mock.calls[0]![1]?.body as string)).toEqual({ uuid: 'u-1' });

    // An empty answer (the host closed without a body) still counts as an answer.
    await expect(apiWith(new Response('', { status: 200 })).api.unpair('u-1')).resolves.toBeUndefined();
    await expect(apiWith(new TypeError('offline')).api.disconnect('u-1')).rejects.toBeInstanceOf(AppError);
  });

  it('posts unpair-all and returns the status', async () => {
    const ok = apiWith(jsonResponse({ status: true }));
    await expect(ok.api.unpairAll()).resolves.toBe(true);
    expect(ok.fetch.mock.calls[0]![0]).toBe('./api/clients/unpair-all');
    expect(ok.fetch.mock.calls[0]![1]?.method).toBe('POST');
    await expect(apiWith(jsonResponse({ status: false })).api.unpairAll()).resolves.toBe(false);
    await expect(apiWith(new Response('', { status: 200 })).api.unpairAll()).resolves.toBe(false);
  });
});
