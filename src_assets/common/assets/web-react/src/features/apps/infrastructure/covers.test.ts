import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/infrastructure/http';
import { jsonResponse } from '@/shared/testing';
import { createCoversPort } from './covers';

const DB = 'https://raw.githubusercontent.com/LizardByte/GameDB/gh-pages';
const THUMB = (slug: string) => `//images.igdb.com/igdb/image/upload/t_thumb/${slug}.jpg`;

function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn((input: string) => {
    const route = routes[input];
    return route ? Promise.resolve(route()) : Promise.reject(new TypeError(`no route ${input}`));
  });
}

function fakeHttp(postJson: HttpClient['postJson']): HttpClient {
  return { getJson: vi.fn(), postJson } as unknown as HttpClient;
}

describe('createCoversPort.search', () => {
  it('reads the bucket of the name, then only the games whose name starts with it', async () => {
    const fetchJson = fakeFetch({
      [`${DB}/buckets/do.json`]: () =>
        jsonResponse({ '1': { name: 'Doom' }, '2': { name: 'Doom Eternal' }, '3': { name: 'Doodle' } }),
      [`${DB}/games/1.json`]: () => jsonResponse({ id: 1, name: 'Doom', cover: { url: THUMB('co1') } }),
      [`${DB}/games/2.json`]: () => jsonResponse({ id: 2, name: 'Doom Eternal', cover: { url: THUMB('co2') } }),
    });
    const found = await createCoversPort(fakeHttp(vi.fn()), fetchJson).search('  Doom ');
    expect(found.map((cover) => cover.key)).toEqual(['igdb_1', 'igdb_2']);
    expect(found[0]?.saveUrl).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1.png');
    expect(fetchJson.mock.calls.map(([url]) => url)).toEqual([
      `${DB}/buckets/do.json`,
      `${DB}/games/1.json`,
      `${DB}/games/2.json`,
    ]);
  });

  it('makes no request for an empty name', async () => {
    const fetchJson = fakeFetch({});
    expect(await createCoversPort(fakeHttp(vi.fn()), fetchJson).search('   ')).toEqual([]);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('uses the @ bucket when the name has no letters or digits at the start', async () => {
    const fetchJson = fakeFetch({ [`${DB}/buckets/@.json`]: () => jsonResponse({}) });
    expect(await createCoversPort(fakeHttp(vi.fn()), fetchJson).search('!?x')).toEqual([]);
    expect(fetchJson).toHaveBeenCalledWith(`${DB}/buckets/@.json`, undefined);
  });

  it('rejects when the bucket cannot be read', async () => {
    const fetchJson = fakeFetch({ [`${DB}/buckets/do.json`]: () => new Response('nope', { status: 404 }) });
    await expect(createCoversPort(fakeHttp(vi.fn()), fetchJson).search('doom')).rejects.toThrow(
      'Failed to search covers',
    );
  });

  it('skips games that fail to load or have no cover', async () => {
    const fetchJson = fakeFetch({
      [`${DB}/buckets/do.json`]: () =>
        jsonResponse({
          '1': { name: 'Doom' },
          '2': { name: 'Doom 2' },
          '3': { name: 'Doom 3' },
          '4': { name: 'Doom 4' },
        }),
      [`${DB}/games/1.json`]: () => jsonResponse({ id: 1, name: 'Doom' }),
      [`${DB}/games/2.json`]: () => new Response('missing', { status: 404 }),
      [`${DB}/games/3.json`]: () => jsonResponse({ id: 3, name: 'Doom 3', cover: { url: THUMB('co3') } }),
    });
    const found = await createCoversPort(fakeHttp(vi.fn()), fetchJson).search('doom');
    expect(found.map((cover) => cover.key)).toEqual(['igdb_3']);
  });

  it('passes the abort signal on and does not swallow an abort', async () => {
    const controller = new AbortController();
    const fetchJson = vi.fn((url: string) => {
      if (url.includes('/buckets/')) {
        return Promise.resolve(jsonResponse({ '1': { name: 'Doom' } }));
      }
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    await expect(createCoversPort(fakeHttp(vi.fn()), fetchJson).search('doom', controller.signal)).rejects.toThrow(
      'aborted',
    );
  });
});

describe('createCoversPort.upload', () => {
  const candidate = { name: 'Doom', key: 'igdb_1', url: 'https://x/a.jpg', saveUrl: 'https://x/a.png' };

  it('posts the key and the save URL and returns the stored path', async () => {
    const postJson = vi.fn(() => Promise.resolve({ status: true, path: 'C:/covers/igdb_1.png' }));
    const path = await createCoversPort(fakeHttp(postJson as HttpClient['postJson']), fakeFetch({})).upload(candidate);
    expect(path).toBe('C:/covers/igdb_1.png');
    expect(postJson).toHaveBeenCalledWith('./api/covers/upload', { key: 'igdb_1', url: 'https://x/a.png' });
  });

  it('fails when the host answers without a path', async () => {
    const postJson = vi.fn(() => Promise.resolve({ status: true }));
    await expect(
      createCoversPort(fakeHttp(postJson as HttpClient['postJson']), fakeFetch({})).upload(candidate),
    ).rejects.toThrow('cover path');
  });

  it('propagates a host failure', async () => {
    const postJson = vi.fn(() => Promise.reject(new Error('Failed to download cover')));
    await expect(
      createCoversPort(fakeHttp(postJson as HttpClient['postJson']), fakeFetch({})).upload(candidate),
    ).rejects.toThrow('Failed to download cover');
  });
});
