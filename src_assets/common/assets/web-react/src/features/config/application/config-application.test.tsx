import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/kernel';
import { createTestQueryClient } from '@/shared/testing';
import { loadConfig, useConfigSession, type ConfigSession } from './load-config';
import type { ConfigPort, PageEnvironment, RestartOutcome, SaveOutcome } from './ports';
import { RELOAD_AFTER_NETWORK_ERROR_MS, RESTART_NOTE_MS, useConfigEditor } from './use-config-editor';

const FAILED = { status: 'failed' } as const;

function fakePort(
  body: Record<string, unknown> = { platform: 'windows', sunshine_name: 'Host' },
  save: SaveOutcome = 'saved',
  restart: RestartOutcome = 'ok',
) {
  return {
    load: vi.fn(async () => body),
    save: vi.fn(async (_payload: Readonly<Record<string, unknown>>) => save),
    restart: vi.fn(async () => restart),
  } satisfies ConfigPort;
}

/** Timers run by hand so the 5 s and 1 s delays are checked without waiting. */
function fakeEnv() {
  const timers = new Map<number, { callback: () => void; ms: number }>();
  let next = 1;
  const env = {
    reload: vi.fn(),
    setTimeout: vi.fn((callback: () => void, ms: number) => {
      const handle = next++;
      timers.set(handle, { callback, ms });
      return handle;
    }),
    clearTimeout: vi.fn((handle: unknown) => {
      timers.delete(handle as number);
    }),
  } satisfies PageEnvironment;
  const run = (ms: number) => {
    for (const [handle, timer] of [...timers]) {
      if (timer.ms === ms) {
        timers.delete(handle);
        act(() => timer.callback());
      }
    }
  };
  return { env, timers, run };
}

describe('loadConfig', () => {
  it('filters the tabs by platform and builds the model', async () => {
    const session = await loadConfig(fakePort({ platform: 'macos', vdisplayStatus: 2 }));
    expect(session.platform).toBe('macos');
    expect(session.tabs.map((tab) => tab.id)).toEqual([
      'general',
      'input',
      'av',
      'network',
      'files',
      'advanced',
      'vt',
      'sw',
    ]);
    expect(session.config['vt_coder']).toBe('auto');
    expect(session.config['nvenc_preset']).toBeUndefined();
    expect(session.vdisplayStatus).toBe(2);
  });

  it('rejects an unknown platform', async () => {
    await expect(loadConfig(fakePort({ platform: 'freebsd' }))).rejects.toMatchObject({ kind: 'parse' });
  });

  it('is exposed as a query loaded once', async () => {
    const port = fakePort();
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useConfigSession(port), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.config['sunshine_name']).toBe('Host');
    expect(port.load).toHaveBeenCalledOnce();
  });

  it('reports load errors as AppError', async () => {
    const port = fakePort();
    port.load.mockRejectedValueOnce(new AppError('network', 'down'));
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useConfigSession(port), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe('network');
  });
});

async function setupEditor(port = fakePort(), body?: Record<string, unknown>) {
  const session: ConfigSession = await loadConfig(body ? fakePort(body) : port);
  const timers = fakeEnv();
  const hook = renderHook(() => useConfigEditor(session, port, timers.env));
  return { ...hook, port, ...timers };
}

describe('useConfigEditor', () => {
  it('updates one option without touching the others', async () => {
    const { result } = await setupEditor();
    const before = result.current.config;
    act(() => result.current.update('port', 48000));
    act(() => result.current.update('global_prep_cmd', [{ do: 'x', undo: '', elevated: false }]));
    expect(result.current.config['port']).toBe(48000);
    expect(result.current.config.global_prep_cmd).toHaveLength(1);
    expect(result.current.config['sunshine_name']).toBe('Host');
    expect(before['port']).toBe(47989);
  });

  it('saves the stripped payload and shows the apply state on 200', async () => {
    const { result, port } = await setupEditor();
    act(() => result.current.update('port', 48000));
    let ok = false;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(true);
    expect(port.save).toHaveBeenCalledWith({ sunshine_name: 'Host', port: 48000 });
    expect(result.current.saved).toBe(true);
    expect(result.current.restarted).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('stays unsaved when the save fails', async () => {
    const { result } = await setupEditor(fakePort(undefined, FAILED));
    let ok = true;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(false);
    expect(result.current.saved).toBe(false);
    expect(result.current.saveError).toEqual({ status: 'failed' });
  });

  it('keeps the server message of a failed save and clears it on the next save', async () => {
    const port = fakePort();
    port.save.mockResolvedValueOnce({ status: 'failed', error: 'disk full' } as never);
    const { result } = await setupEditor(port);
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.saveError).toEqual({ status: 'failed', error: 'disk full' });
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.saveError).toBeNull();
    expect(result.current.saved).toBe(true);
  });

  it('puts an invalid fallback mode back to the last valid one in the model', async () => {
    const port = fakePort({ platform: 'windows', fallback_mode: '1920x1080x60' });
    const { result } = await setupEditor(port, { platform: 'windows', fallback_mode: '1920x1080x60' });
    act(() => result.current.update('fallback_mode', '800x600'));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.config['fallback_mode']).toBe('1920x1080x60');
    expect(port.save.mock.calls[0]![0]).toMatchObject({ fallback_mode: '1920x1080x60' });
  });

  it('applies: saves, shows the restart note for 5 s and restarts the host', async () => {
    const { result, port, run, env } = await setupEditor();
    await act(async () => {
      await result.current.apply();
    });
    expect(port.save).toHaveBeenCalledOnce();
    expect(port.restart).toHaveBeenCalledOnce();
    expect(result.current.restarted).toBe(true);
    run(RESTART_NOTE_MS);
    expect(result.current.restarted).toBe(false);
    expect(result.current.saved).toBe(false);
    expect(env.reload).not.toHaveBeenCalled();
  });

  it('does not restart when the save fails', async () => {
    const { result, port } = await setupEditor(fakePort(undefined, FAILED));
    await act(async () => {
      await result.current.apply();
    });
    expect(port.restart).not.toHaveBeenCalled();
    expect(result.current.restarted).toBe(false);
  });

  it('reloads at once when the restart is rejected', async () => {
    const { result, env } = await setupEditor(fakePort(undefined, 'saved', 'rejected'));
    await act(async () => {
      await result.current.apply();
    });
    expect(env.reload).toHaveBeenCalledOnce();
  });

  it('reloads after 1 s when the host is unreachable', async () => {
    const { result, env, run } = await setupEditor(fakePort(undefined, 'saved', 'unreachable'));
    await act(async () => {
      await result.current.apply();
    });
    expect(env.reload).not.toHaveBeenCalled();
    run(RELOAD_AFTER_NETWORK_ERROR_MS);
    expect(env.reload).toHaveBeenCalledOnce();
  });

  it('cancels the pending timers on unmount', async () => {
    const { result, env, timers, unmount } = await setupEditor(fakePort(undefined, 'saved', 'unreachable'));
    await act(async () => {
      await result.current.apply();
    });
    expect(timers.size).toBe(2);
    unmount();
    expect(env.clearTimeout).toHaveBeenCalledTimes(2);
    expect(timers.size).toBe(0);
  });
});
