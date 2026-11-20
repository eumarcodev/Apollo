import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/shared/testing';
import type { MaintenancePort } from './ports';
import { useLogs } from './use-logs';
import { useMaintenance } from './use-maintenance';

function port(overrides: Partial<MaintenancePort> = {}): MaintenancePort {
  return {
    closeApps: vi.fn().mockResolvedValue(true),
    restart: vi.fn().mockResolvedValue('accepted'),
    quit: vi.fn().mockResolvedValue('unreachable'),
    resetDisplayPersistence: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('useMaintenance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('force close: disables the button while running and shows the status for 5 s', async () => {
    let finish: (status: boolean) => void = () => undefined;
    const closeApps = vi.fn().mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useMaintenance(port({ closeApps })));
    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.closeApps();
    });
    expect(result.current.closeAppPressed).toBe(true);
    await act(async () => {
      finish(true);
      await run;
    });
    expect(result.current.closeAppPressed).toBe(false);
    expect(result.current.closeAppStatus).toBe(true);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.closeAppStatus).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.closeAppStatus).toBeNull();
  });

  it('force close: a failed request shows the error and enables the button again', async () => {
    const closeApps = vi.fn().mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useMaintenance(port({ closeApps })));
    await act(async () => {
      await result.current.closeApps();
    });
    expect(result.current.closeAppStatus).toBe(false);
    expect(result.current.closeAppPressed).toBe(false);
  });

  it('display reset: shows the status of the answer for 5 s', async () => {
    const { result } = renderHook(() =>
      useMaintenance(port({ resetDisplayPersistence: vi.fn().mockResolvedValue(false) })),
    );
    await act(async () => {
      await result.current.resetDisplay();
    });
    expect(result.current.ddResetStatus).toBe(false);
    expect(result.current.ddResetPressed).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.ddResetStatus).toBeNull();
  });

  it('restart: shows the message for 5 s and does not reload when the host accepted', async () => {
    const reload = vi.fn();
    const { result } = renderHook(() => useMaintenance(port(), { reload }));
    await act(async () => {
      await result.current.restart();
    });
    expect(result.current.restarting).toBe(true);
    expect(result.current.busy).toBe(true);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.restarting).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('restart: a rejected request keeps the message and reloads after 1 s', async () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useMaintenance(port({ restart: vi.fn().mockResolvedValue('rejected') }), { reload }),
    );
    await act(async () => {
      await result.current.restart();
    });
    expect(result.current.restarting).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it('restart: a network error hides the message and reloads after 1 s', async () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useMaintenance(port({ restart: vi.fn().mockResolvedValue('unreachable') }), { reload }),
    );
    await act(async () => {
      await result.current.restart();
    });
    expect(result.current.restarting).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it('restart: a port that throws is treated as rejected', async () => {
    const reload = vi.fn();
    const { result } = renderHook(() =>
      useMaintenance(port({ restart: vi.fn().mockRejectedValue(new Error('x')) }), { reload }),
    );
    await act(async () => {
      await result.current.restart();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it('restart: pending timers die with the page', async () => {
    const reload = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMaintenance(port({ restart: vi.fn().mockResolvedValue('rejected') }), { reload }),
    );
    await act(async () => {
      await result.current.restart();
    });
    unmount();
    vi.advanceTimersByTime(10000);
    expect(reload).not.toHaveBeenCalled();
  });

  it('quit: a request that fails means the host exited', async () => {
    let finish: (outcome: 'unreachable') => void = () => undefined;
    const quit = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useMaintenance(port({ quit })));
    let exited: Promise<boolean> = Promise.resolve(false);
    act(() => {
      exited = result.current.quit();
    });
    expect(result.current.quitState).toBe('quitting');
    expect(result.current.busy).toBe(true);
    await act(async () => {
      finish('unreachable');
      await expect(exited).resolves.toBe(true);
    });
    expect(result.current.quitState).toBe('quit');
  });

  it('quit: an answer means the exit failed and the page goes back to idle', async () => {
    const { result } = renderHook(() => useMaintenance(port({ quit: vi.fn().mockResolvedValue('answered') })));
    let exited = true;
    await act(async () => {
      exited = await result.current.quit();
    });
    expect(exited).toBe(false);
    expect(result.current.quitState).toBe('idle');
    expect(result.current.busy).toBe(false);
  });

  it('quit: a port that throws is treated as an answer', async () => {
    const { result } = renderHook(() => useMaintenance(port({ quit: vi.fn().mockRejectedValue(new Error('x')) })));
    let exited = true;
    await act(async () => {
      exited = await result.current.quit();
    });
    expect(exited).toBe(false);
  });

  it('reloads through window.location by default', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload } as unknown as Location);
    const { result } = renderHook(() => useMaintenance(port({ restart: vi.fn().mockResolvedValue('rejected') })));
    await act(async () => {
      await result.current.restart();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('useLogs', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
  }

  it('reads on load, polls at the interval and keeps the text when a read fails', async () => {
    const readLogs = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')
      .mockRejectedValue(new Error('down'));
    const { result, unmount } = renderHook(() => useLogs({ readLogs }, 200), { wrapper });
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe('first'));
    await waitFor(() => expect(result.current).toBe('second'));
    await waitFor(() => expect(readLogs.mock.calls.length).toBeGreaterThanOrEqual(4));
    expect(result.current).toBe('second');
    unmount();
    const calls = readLogs.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(readLogs.mock.calls.length).toBe(calls);
  });
});
