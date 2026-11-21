import { describe, expect, it } from 'vitest';
import { DEFAULT_WELCOME_USERNAME, interpretPasswordResponse, validateNewCredentials } from './credentials';
import { parseSavedLogin, readRedirectParam, resolveLoginRedirect, serializeSavedLogin } from './login';

describe('validateNewCredentials', () => {
  it('accepts identical passwords', () => {
    expect(validateNewCredentials({ newUsername: 'a', newPassword: 'x', confirmNewPassword: 'x' })).toBeNull();
  });

  it('reports a mismatch', () => {
    expect(validateNewCredentials({ newUsername: 'a', newPassword: 'x', confirmNewPassword: 'y' })).toBe(
      'password-mismatch',
    );
  });

  it('proposes helios as the first username', () => {
    expect(DEFAULT_WELCOME_USERNAME).toBe('helios');
  });
});

describe('interpretPasswordResponse', () => {
  it('is a success only when status is exactly true', () => {
    expect(interpretPasswordResponse({ status: true })).toEqual({ saved: true });
    expect(interpretPasswordResponse({ status: 'true', error: 'nope' })).toEqual({ saved: false, error: 'nope' });
  });

  it('returns the server error, or an empty one', () => {
    expect(interpretPasswordResponse({ status: false, error: 'Invalid Username' })).toEqual({
      saved: false,
      error: 'Invalid Username',
    });
    expect(interpretPasswordResponse({ status: false })).toEqual({ saved: false, error: '' });
    expect(interpretPasswordResponse(undefined)).toEqual({ saved: false, error: '' });
    expect(interpretPasswordResponse(null)).toEqual({ saved: false, error: '' });
    expect(interpretPasswordResponse({ error: 42 })).toEqual({ saved: false, error: '' });
  });
});

describe('resolveLoginRedirect (open-redirect guard)', () => {
  it('follows a relative redir and keeps the hash', () => {
    expect(resolveLoginRedirect('./config', '#general')).toBe('./config#general');
    expect(resolveLoginRedirect('./', '')).toBe('./');
    expect(resolveLoginRedirect('../troubleshooting', '')).toBe('../troubleshooting');
  });

  it.each(['https://evil.example/', '//evil.example', '/config', 'javascript:alert(1)', ' ./config', 'config'])(
    'ignores %s and goes home',
    (redir) => {
      expect(resolveLoginRedirect(redir, '#logs')).toBe('./#logs');
    },
  );

  it('goes home without a redir', () => {
    expect(resolveLoginRedirect(null, '')).toBe('./');
    expect(resolveLoginRedirect('', '#x')).toBe('./#x');
  });

  it('reads the redir parameter of the search string', () => {
    expect(readRedirectParam('?redir=./config')).toBe('./config');
    expect(readRedirectParam('?redir=.%2Fapps')).toBe('./apps');
    expect(readRedirectParam('')).toBeNull();
  });
});

describe('saved login (localStorage.login)', () => {
  it('reads the legacy format', () => {
    expect(parseSavedLogin('{"username":"u","password":"p"}')).toEqual({ username: 'u', password: 'p' });
  });

  it('ignores nothing stored, invalid JSON and non objects', () => {
    expect(parseSavedLogin(null)).toBeNull();
    expect(parseSavedLogin('')).toBeNull();
    expect(parseSavedLogin('{not json')).toBeNull();
    expect(parseSavedLogin('null')).toBeNull();
    expect(parseSavedLogin('42')).toBeNull();
  });

  it('turns missing fields into empty strings', () => {
    expect(parseSavedLogin('{"username":7}')).toEqual({ username: '', password: '' });
  });

  it('writes only username and password', () => {
    const extra = { username: 'u', password: 'p', other: 1 } as never;
    expect(JSON.parse(serializeSavedLogin(extra))).toEqual({ username: 'u', password: 'p' });
  });
});
