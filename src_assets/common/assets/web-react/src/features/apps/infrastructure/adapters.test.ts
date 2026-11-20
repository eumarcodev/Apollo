import { describe, expect, it, vi } from 'vitest';
import { createHttpClient, type FetchLike } from '@/shared/infrastructure/http';
import { jsonResponse } from '@/shared/testing';
import { createAppsPort } from './adapters';

function portWith(fetchMock: ReturnType<typeof vi.fn>) {
  const fetch = fetchMock as unknown as FetchLike;
  return createAppsPort(createHttpClient({ fetch, onUnauthorized: () => undefined }));
}

describe('createAppsPort', () => {
  it('reads the listing from GET ./api/apps', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        apps: [{ uuid: 'a', name: 'A' }, { name: 'x' }],
        current_app: 'a',
        host_name: 'PC',
        host_uuid: 'h',
      }),
    );
    const listing = await portWith(fetchMock).list();
    expect(listing).toEqual({ apps: [{ uuid: 'a', name: 'A' }], currentApp: 'a', hostName: 'PC', hostUuid: 'h' });
    expect(fetchMock).toHaveBeenCalledWith('./api/apps', expect.objectContaining({ method: 'GET' }));
  });

  it('posts the legacy bodies', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ status: true })));
    const port = portWith(fetchMock);
    await expect(port.reorder(['a', 'b'])).resolves.toEqual({ status: true });
    await port.launch('a');
    await port.remove('b');
    await port.close();
    const calls = fetchMock.mock.calls.map(([url, init]) => [
      url,
      (init as RequestInit).method,
      (init as RequestInit).body,
    ]);
    expect(calls).toEqual([
      ['./api/apps/reorder', 'POST', JSON.stringify({ order: ['a', 'b'] })],
      ['./api/apps/launch', 'POST', JSON.stringify({ uuid: 'a' })],
      ['./api/apps/delete', 'POST', JSON.stringify({ uuid: 'b' })],
      ['./api/apps/close', 'POST', undefined],
    ]);
  });

  it('turns the host error body (HTTP 400) into a failed result with the message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: false, error: 'Cannot find requested application' }, 400));
    await expect(portWith(fetchMock).launch('zzz')).resolves.toEqual({
      status: false,
      error: 'Cannot find requested application',
    });
  });

  it('treats a missing status as failure and keeps an error text from a 200 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: false, error: 'nope' }));
    await expect(portWith(fetchMock).close()).resolves.toEqual({ status: false, error: 'nope' });
    const empty = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    await expect(portWith(empty).close()).resolves.toEqual({ status: false });
  });

  it('lets network failures propagate', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(portWith(fetchMock).close()).rejects.toMatchObject({ kind: 'network' });
  });
});
