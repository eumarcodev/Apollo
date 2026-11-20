import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyPasswordChange, type PasswordChange } from '@/features/password/domain/password-change';
import type { PasswordPort } from './ports';
import { submitPasswordChange } from './submit-password-change';
import { usePasswordChange } from './use-password-change';

const FORM: PasswordChange = {
  currentUsername: 'x',
  currentPassword: 'old',
  newUsername: '',
  newPassword: 'new',
  confirmNewPassword: 'new',
};

function port(change: PasswordPort['change']): PasswordPort {
  return { change };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('submitPasswordChange', () => {
  it('does not call the server when the confirmation differs', async () => {
    const change = vi.fn();
    const outcome = await submitPasswordChange(port(change), { ...FORM, confirmNewPassword: 'other' });
    expect(outcome).toEqual({ kind: 'mismatch' });
    expect(change).not.toHaveBeenCalled();
  });

  it('sends the five fields and reports success', async () => {
    const change = vi.fn().mockResolvedValue({ status: true });
    expect(await submitPasswordChange(port(change), FORM)).toEqual({ kind: 'success' });
    expect(change).toHaveBeenCalledWith(FORM, undefined);
  });

  it('reports the error of a rejected change', async () => {
    const change = vi.fn().mockResolvedValue({ status: false, error: 'nope' });
    expect(await submitPasswordChange(port(change), FORM)).toEqual({ kind: 'rejected', message: 'nope' });
  });

  it('reports a failure when the request throws', async () => {
    const change = vi.fn().mockRejectedValue(new Error('HTTP 400'));
    expect(await submitPasswordChange(port(change), FORM)).toEqual({ kind: 'failed' });
  });
});

describe('usePasswordChange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => usePasswordChange(port(vi.fn())));
    expect(result.current.outcome).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('reloads five seconds after a success, not before', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const { result } = renderHook(() => usePasswordChange(port(vi.fn().mockResolvedValue({ status: true })), reload));
    await act(async () => {
      await result.current.submit(FORM);
    });
    expect(result.current.outcome).toEqual({ kind: 'success' });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(reload).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads after an error and clears the previous outcome on a new submit', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const change = vi.fn().mockResolvedValue({ status: false, error: 'bad' });
    const { result } = renderHook(() => usePasswordChange(port(change), reload));
    await act(async () => {
      await result.current.submit({ ...emptyPasswordChange(), newPassword: 'a', confirmNewPassword: 'b' });
    });
    expect(result.current.outcome).toEqual({ kind: 'mismatch' });
    await act(async () => {
      await result.current.submit(FORM);
    });
    expect(result.current.outcome).toEqual({ kind: 'rejected', message: 'bad' });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it('is pending while the request runs', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    const change = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => usePasswordChange(port(change)));
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.submit(FORM);
    });
    await waitFor(() => expect(result.current.pending).toBe(true));
    await act(async () => {
      resolve({ status: true });
      await done;
    });
    expect(result.current.pending).toBe(false);
  });
});
