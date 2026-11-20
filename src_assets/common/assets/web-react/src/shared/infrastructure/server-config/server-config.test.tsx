import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/infrastructure/http';
import { buildServerConfigDto, createTestQueryClient } from '@/shared/testing';
import { fetchServerConfig, toServerConfig } from './server-config';
import { useServerConfig } from './use-server-config';

function fakeHttp(body: unknown): HttpClient {
  return {
    getJson: vi.fn().mockResolvedValue(body),
    getText: vi.fn(),
    postJson: vi.fn(),
  };
}

describe('toServerConfig', () => {
  it('splits metadata from options', () => {
    const config = toServerConfig(
      buildServerConfigDto({ sunshine_name: 'Host', port: '47989', min_log_level: '2', something: 5 }),
    );
    expect(config).toEqual({
      platform: 'windows',
      version: '1.0.0-test',
      updateRepo: 'eumarcodev/Helios-Server',
      vdisplayStatus: 0,
      options: { locale: 'en', sunshine_name: 'Host', port: '47989', min_log_level: '2', something: '5' },
    });
  });

  it('handles missing optional metadata (non-Windows hosts)', () => {
    const config = toServerConfig({ status: true, platform: 'linux', empty: null });
    expect(config).toMatchObject({ platform: 'linux', version: '', updateRepo: null, vdisplayStatus: null });
    expect(config.options).toEqual({});
  });

  it('rejects an unknown platform', () => {
    expect(() => toServerConfig(buildServerConfigDto({ platform: 'amiga' }))).toThrow(/Unsupported platform/);
  });
});

describe('fetchServerConfig', () => {
  it('reads ./api/config', async () => {
    const http = fakeHttp(buildServerConfigDto({ platform: 'macos' }));
    await expect(fetchServerConfig(http)).resolves.toMatchObject({ platform: 'macos' });
    expect(http.getJson).toHaveBeenCalledWith('./api/config', {});
  });
});

describe('useServerConfig', () => {
  it('exposes the parsed config through react-query', async () => {
    const http = fakeHttp(buildServerConfigDto());
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useServerConfig(http), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.platform).toBe('windows');
    expect(http.getJson).toHaveBeenCalledWith('./api/config', expect.objectContaining({ signal: expect.anything() }));
  });
});
