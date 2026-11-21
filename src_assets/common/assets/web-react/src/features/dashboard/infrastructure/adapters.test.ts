import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';
import { jsonResponse } from '@/shared/testing';
import { createGithubReleases, createHostLog } from './adapters';

describe('createGithubReleases', () => {
  it('reads the 30 newest releases of the repository without credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([{ tag_name: 'v1.0.0' }]));
    const signal = new AbortController().signal;
    await expect(createGithubReleases(fetchImpl).listReleases('owner/repo', signal)).resolves.toEqual([
      { tag_name: 'v1.0.0' },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases?per_page=30', { signal });
  });

  it('works without an abort signal', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    await createGithubReleases(fetchImpl).listReleases('owner/repo');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases?per_page=30', undefined);
  });

  it('reports a GitHub error status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'rate limit' }, 403));
    await expect(createGithubReleases(fetchImpl).listReleases('o/r')).rejects.toMatchObject({
      kind: 'http',
      status: 403,
    });
  });

  it('reports a network failure and an invalid body', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createGithubReleases(offline).listReleases('o/r')).rejects.toMatchObject({ kind: 'network' });
    const broken = vi.fn().mockResolvedValue(new Response('<html>', { status: 200 }));
    const error: unknown = await createGithubReleases(broken)
      .listReleases('o/r')
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'parse' });
  });
});

describe('createHostLog', () => {
  it('reads ./api/logs as text', async () => {
    const http: HttpClient = { getJson: vi.fn(), getText: vi.fn().mockResolvedValue('log text'), postJson: vi.fn() };
    await expect(createHostLog(http).readLog()).resolves.toBe('log text');
    expect(http.getText).toHaveBeenCalledWith('./api/logs', {});
    const signal = new AbortController().signal;
    await createHostLog(http).readLog(signal);
    expect(http.getText).toHaveBeenLastCalledWith('./api/logs', { signal });
  });
});
