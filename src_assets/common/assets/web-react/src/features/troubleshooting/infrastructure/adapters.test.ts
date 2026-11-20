import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';
import { createLogsReader, createMaintenance } from './adapters';

function http(postJson: HttpClient['postJson']): HttpClient {
  return { getJson: vi.fn(), getText: vi.fn(), postJson };
}

const rejecting = (error: unknown) => vi.fn().mockRejectedValue(error);

describe('createMaintenance', () => {
  it('force close and display reset report the status of the answer', async () => {
    const postJson = vi.fn().mockResolvedValueOnce({ status: true }).mockResolvedValueOnce({ status: false });
    const port = createMaintenance(http(postJson));
    await expect(port.closeApps()).resolves.toBe(true);
    await expect(port.resetDisplayPersistence()).resolves.toBe(false);
    expect(postJson.mock.calls.map((call) => call[0])).toEqual([
      './api/apps/close',
      './api/reset-display-device-persistence',
    ]);
  });

  it('treats an empty answer as a failed status', async () => {
    const port = createMaintenance(http(vi.fn().mockResolvedValue(undefined)));
    await expect(port.closeApps()).resolves.toBe(false);
  });

  it('restart: an answer is accepted, a refused request is rejected, no answer is unreachable', async () => {
    await expect(createMaintenance(http(vi.fn().mockResolvedValue(undefined))).restart()).resolves.toBe('accepted');
    await expect(createMaintenance(http(rejecting(new AppError('parse', 'not json')))).restart()).resolves.toBe(
      'accepted',
    );
    await expect(
      createMaintenance(http(rejecting(new AppError('http', 'Server returned 500', { status: 500 })))).restart(),
    ).resolves.toBe('rejected');
    await expect(createMaintenance(http(rejecting(new AppError('network', 'down')))).restart()).resolves.toBe(
      'unreachable',
    );
  });

  it('quit: only a request that cannot reach the host counts as the host having exited', async () => {
    const answered = vi.fn().mockResolvedValue(undefined);
    await expect(createMaintenance(http(answered)).quit()).resolves.toBe('answered');
    expect(answered).toHaveBeenCalledWith('./api/quit', {}, { redirectOnUnauthorized: false });
    await expect(
      createMaintenance(http(rejecting(new AppError('http', 'boom', { status: 500 })))).quit(),
    ).resolves.toBe('answered');
    await expect(
      createMaintenance(http(rejecting(new AppError('unauthorized', 'no', { status: 401 })))).quit(),
    ).resolves.toBe('answered');
    await expect(createMaintenance(http(rejecting(new AppError('network', 'down')))).quit()).resolves.toBe(
      'unreachable',
    );
  });
});

describe('createLogsReader', () => {
  it('decodes the body with the charset of the Content-Type header', async () => {
    const body = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=windows-1252' } }),
      );
    await expect(createLogsReader(fetch).readLogs()).resolves.toBe('café');
    expect(fetch).toHaveBeenCalledWith('./api/logs', { credentials: 'include' });
  });

  it('defaults to utf-8 and passes the abort signal', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('ação'));
    const controller = new AbortController();
    await expect(createLogsReader(fetch).readLogs(controller.signal)).resolves.toBe('ação');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });

  it('turns failures into AppError', async () => {
    await expect(createLogsReader(vi.fn().mockRejectedValue(new TypeError('x'))).readLogs()).rejects.toMatchObject({
      kind: 'network',
    });
    await expect(
      createLogsReader(vi.fn().mockResolvedValue(new Response('no', { status: 500 }))).readLogs(),
    ).rejects.toMatchObject({ kind: 'http', status: 500 });
    await expect(
      createLogsReader(
        vi.fn().mockResolvedValue(new Response('x', { headers: { 'Content-Type': 'text/plain; charset=nope-1' } })),
      ).readLogs(),
    ).rejects.toMatchObject({ kind: 'parse' });
  });

  it('sends the user to the login page on 401', async () => {
    const onUnauthorized = vi.fn();
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(createLogsReader(fetch, onUnauthorized).readLogs()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
