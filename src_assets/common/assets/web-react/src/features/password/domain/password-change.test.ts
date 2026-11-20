import { describe, expect, it } from 'vitest';
import {
  emptyPasswordChange,
  hasPasswordMismatch,
  interpretPasswordResponse,
  RELOAD_DELAY_MS,
} from './password-change';

describe('password change domain', () => {
  it('starts with five empty fields', () => {
    expect(emptyPasswordChange()).toEqual({
      currentUsername: '',
      currentPassword: '',
      newUsername: '',
      newPassword: '',
      confirmNewPassword: '',
    });
  });

  it('detects a confirmation that differs from the new password', () => {
    expect(hasPasswordMismatch({ ...emptyPasswordChange(), newPassword: 'a', confirmNewPassword: 'b' })).toBe(true);
    expect(hasPasswordMismatch({ ...emptyPasswordChange(), newPassword: 'a', confirmNewPassword: 'a' })).toBe(false);
  });

  it('treats only status true as success', () => {
    expect(interpretPasswordResponse({ status: true })).toEqual({ kind: 'success' });
    expect(interpretPasswordResponse({ status: 'true' })).toEqual({ kind: 'rejected', message: '' });
  });

  it('keeps the server error of a rejected change', () => {
    expect(interpretPasswordResponse({ status: false, error: 'Invalid Current Credentials' })).toEqual({
      kind: 'rejected',
      message: 'Invalid Current Credentials',
    });
  });

  it('survives an empty or malformed body', () => {
    expect(interpretPasswordResponse(undefined)).toEqual({ kind: 'rejected', message: '' });
    expect(interpretPasswordResponse(null)).toEqual({ kind: 'rejected', message: '' });
    expect(interpretPasswordResponse({ status: false, error: 5 })).toEqual({ kind: 'rejected', message: '' });
  });

  it('reloads after five seconds', () => {
    expect(RELOAD_DELAY_MS).toBe(5000);
  });
});
