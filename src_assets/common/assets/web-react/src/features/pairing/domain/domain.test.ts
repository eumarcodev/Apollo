import { describe, expect, it } from 'vitest';
import {
  automaticHostInfo,
  buildDeepLink,
  canSaveHost,
  deepLinkLabel,
  isLocalHostname,
  parseStoredHostInfo,
  streamingPortFromPage,
} from './host-address';
import {
  currentDeepLink,
  INITIAL_OTP_STATE,
  messageStatus,
  OTP_LIFETIME_MS,
  otpReducer,
  PASSPHRASE_PATTERN,
  PIN_PATTERN,
  showsDeepLink,
  type OtpState,
} from './otp-pairing';
import { isPairingTab, PAIRING_TABS, tabFromHash } from './pairing-tab';

describe('pairing tab', () => {
  it('opens the PIN tab only for #PIN', () => {
    expect(tabFromHash('#PIN')).toBe('PIN');
    expect(tabFromHash('#OTP')).toBe('OTP');
    expect(tabFromHash('')).toBe('OTP');
    expect(tabFromHash('#pin')).toBe('OTP');
    expect(tabFromHash('#other')).toBe('OTP');
  });

  it('lists OTP first and recognises the tab keys', () => {
    expect(PAIRING_TABS).toEqual(['OTP', 'PIN']);
    expect(isPairingTab('PIN')).toBe(true);
    expect(isPairingTab('pin')).toBe(false);
    expect(isPairingTab(1)).toBe(false);
  });
});

describe('host address', () => {
  it('treats localhost, 127.0.0.1 and [::1] as this machine', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(isLocalHostname(host)).toBe(true);
    }
    for (const host of ['192.168.1.10', 'helios.lan', '::1', '']) {
      expect(isLocalHostname(host)).toBe(false);
    }
  });

  it('derives the streaming port from the page port like parseInt(port) - 1', () => {
    expect(streamingPortFromPage('47990')).toBe('47989');
    expect(streamingPortFromPage('')).toBe('NaN');
  });

  it('uses the reported address on this machine and the page hostname elsewhere', () => {
    expect(automaticHostInfo({ reportedIp: '10.0.0.5', pageHostname: 'localhost', pagePort: '47990' })).toEqual({
      hostAddr: '10.0.0.5',
      hostPort: '47989',
    });
    expect(automaticHostInfo({ reportedIp: '10.0.0.5', pageHostname: 'helios.lan', pagePort: '48000' })).toEqual({
      hostAddr: 'helios.lan',
      hostPort: '47999',
    });
  });

  it('saves a host only with both fields', () => {
    expect(canSaveHost({ hostAddr: 'a', hostPort: '1' })).toBe(true);
    expect(canSaveHost({ hostAddr: '', hostPort: '1' })).toBe(false);
    expect(canSaveHost({ hostAddr: 'a', hostPort: '' })).toBe(false);
  });

  it('reads sessionStorage.hostInfo and ignores anything else', () => {
    expect(parseStoredHostInfo('{"hostAddr":"pc","hostPort":"47989"}')).toEqual({ hostAddr: 'pc', hostPort: '47989' });
    expect(parseStoredHostInfo('{"hostAddr":"pc","hostPort":47989}')).toEqual({ hostAddr: 'pc', hostPort: '47989' });
    expect(parseStoredHostInfo(null)).toBeNull();
    expect(parseStoredHostInfo('')).toBeNull();
    expect(parseStoredHostInfo('null')).toBeNull();
    expect(parseStoredHostInfo('{bad')).toBeNull();
    expect(parseStoredHostInfo('"text"')).toBeNull();
    expect(parseStoredHostInfo('{"hostAddr":"pc"}')).toBeNull();
    expect(parseStoredHostInfo('{"hostAddr":"pc","hostPort":null}')).toBeNull();
  });

  it('builds the art:// deep link with encodeURI', () => {
    expect(
      buildDeepLink({ hostAddr: '10.0.0.5', hostPort: '47989', otp: '1234', passphrase: 'abcd', hostName: 'My PC' }),
    ).toBe('art://10.0.0.5:47989?pin=1234&passphrase=abcd&name=My%20PC');
    expect(
      buildDeepLink({ hostAddr: 'host', hostPort: '1', otp: '0', passphrase: 'pass', hostName: 'Sala de Jogos ☀' }),
    ).toBe('art://host:1?pin=0&passphrase=pass&name=Sala%20de%20Jogos%20%E2%98%80');
    expect(deepLinkLabel({ hostAddr: 'pc', hostPort: '47989' })).toBe('art://pc:47989');
  });
});

describe('OTP state', () => {
  const host = { hostAddr: '10.0.0.5', hostPort: '47989' };
  const withInput = otpReducer(otpReducer(INITIAL_OTP_STATE, { type: 'passphraseChanged', value: 'abcd' }), {
    type: 'deviceNameChanged',
    value: 'Tablet',
  });

  it('exposes the legacy constants', () => {
    expect(OTP_LIFETIME_MS).toBe(180000);
    expect(new RegExp(`^(?:${PASSPHRASE_PATTERN})$`).test('ab12')).toBe(true);
    expect(new RegExp(`^(?:${PASSPHRASE_PATTERN})$`).test('ab1')).toBe(false);
    expect(new RegExp(`^(?:${PASSPHRASE_PATTERN})$`).test('ab 12')).toBe(false);
    expect(new RegExp(`^(?:${PIN_PATTERN})$`).test('0123')).toBe(true);
    expect(new RegExp(`^(?:${PIN_PATTERN})$`).test('12a')).toBe(false);
  });

  it('shows the code, the success message and draws the QR on success', () => {
    const state = otpReducer(withInput, { type: 'succeeded', otp: '5678', hostName: 'Helios PC', host });
    expect(state.code).toEqual({ kind: 'otp', value: '5678' });
    expect(state.message).toEqual({ kind: 'success' });
    expect(state.passphrase).toBe('abcd');
    expect(state.qrLink).toBe('art://10.0.0.5:47989?pin=5678&passphrase=abcd&name=Helios%20PC');
    expect(showsDeepLink(state)).toBe(true);
  });

  it('keeps the code but no QR when the host address is unknown', () => {
    const state = otpReducer(withInput, {
      type: 'succeeded',
      otp: '5678',
      hostName: 'Helios PC',
      host: { hostAddr: '', hostPort: '47989' },
    });
    expect(state.code).toEqual({ kind: 'otp', value: '5678' });
    expect(state.qrLink).toBeNull();
    expect(showsDeepLink(state)).toBe(false);
  });

  it('shows the server message on failure and hides the alert without one', () => {
    const failed = otpReducer(withInput, { type: 'failed', message: 'Passphrase too short!' });
    expect(failed.message).toEqual({ kind: 'error', text: 'Passphrase too short!' });
    expect(otpReducer(failed, { type: 'failed', message: undefined }).message).toBeNull();
    expect(messageStatus({ kind: 'error', text: 'x' })).toBe('danger');
    expect(messageStatus({ kind: 'success' })).toBe('success');
    expect(messageStatus({ kind: 'expired' })).toBe('warning');
  });

  it('forgets everything but announces the expiry when the OTP expires', () => {
    const success = otpReducer(withInput, { type: 'succeeded', otp: '5678', hostName: 'Helios PC', host });
    const expired = otpReducer(success, { type: 'expired' });
    expect(expired).toEqual({ ...INITIAL_OTP_STATE, code: { kind: 'expired' }, message: { kind: 'expired' } });
    expect(showsDeepLink(expired)).toBe(false);
    expect(otpReducer(expired, { type: 'reset' })).toEqual(INITIAL_OTP_STATE);
  });

  it('edits the host: toggling restores the cached host, saving redraws the QR', () => {
    const success = otpReducer(withInput, { type: 'succeeded', otp: '5678', hostName: 'PC', host });
    let state: OtpState = otpReducer(success, { type: 'hostEditingToggled', cached: null });
    expect(state.editingHost).toBe(true);
    expect(state.host).toEqual(host);
    state = otpReducer(state, { type: 'hostAddrChanged', value: 'pc.lan' });
    state = otpReducer(state, { type: 'hostPortChanged', value: '50000' });
    expect(currentDeepLink(state)).toBe('art://pc.lan:50000?pin=5678&passphrase=abcd&name=PC');
    expect(state.qrLink).toBe(success.qrLink);
    const saved = otpReducer(state, { type: 'hostSaved' });
    expect(saved.editingHost).toBe(false);
    expect(saved.qrLink).toBe('art://pc.lan:50000?pin=5678&passphrase=abcd&name=PC');
    const cancelled = otpReducer(otpReducer(state, { type: 'hostEditingToggled', cached: host }), {
      type: 'hostEditingToggled',
      cached: host,
    });
    expect(cancelled.host).toEqual(host);
  });

  it('refuses to save an incomplete host', () => {
    const editing = otpReducer(INITIAL_OTP_STATE, { type: 'hostEditingToggled', cached: null });
    expect(showsDeepLink(editing)).toBe(true);
    const half = otpReducer(editing, { type: 'hostAddrChanged', value: 'pc' });
    expect(otpReducer(half, { type: 'hostSaved' })).toBe(half);
  });
});
