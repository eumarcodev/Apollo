import { buildDeepLink, canSaveHost, type HostInfo } from './host-address';

/** How long the host accepts an OTP; the page forgets it after the same time. */
export const OTP_LIFETIME_MS = 3 * 60 * 1000;

/** Characters and minimum length the passphrase input accepts (HTML `pattern`, implicitly anchored). */
export const PASSPHRASE_PATTERN = '[0-9a-zA-Z]{4,}';

/** The PIN input accepts digits only (HTML `pattern`, implicitly anchored). */
export const PIN_PATTERN = '\\d*';

export type OtpCode = { kind: 'none' } | { kind: 'otp'; value: string } | { kind: 'expired' };

export type OtpMessage = { kind: 'success' } | { kind: 'expired' } | { kind: 'error'; text: string };

export interface OtpState {
  code: OtpCode;
  passphrase: string;
  deviceName: string;
  /** Host written into the deep link (editable by hand). */
  host: HostInfo;
  /** Host name reported by `POST /api/otp`. */
  hostName: string;
  editingHost: boolean;
  /** Deep link drawn in the QR code: updated on a new OTP and on a saved host, not while typing. */
  qrLink: string | null;
  message: OtpMessage | null;
}

export type OtpAction =
  | { type: 'reset' }
  | { type: 'passphraseChanged'; value: string }
  | { type: 'deviceNameChanged'; value: string }
  | { type: 'hostAddrChanged'; value: string }
  | { type: 'hostPortChanged'; value: string }
  | { type: 'failed'; message: string | undefined }
  | { type: 'succeeded'; otp: string; hostName: string; host: HostInfo }
  | { type: 'expired' }
  | { type: 'hostEditingToggled'; cached: HostInfo | null }
  | { type: 'hostSaved' };

export const INITIAL_OTP_STATE: OtpState = {
  code: { kind: 'none' },
  passphrase: '',
  deviceName: '',
  host: { hostAddr: '', hostPort: '' },
  hostName: '',
  editingHost: false,
  qrLink: null,
  message: null,
};

function codeText(code: OtpCode): string {
  return code.kind === 'otp' ? code.value : '';
}

/** Deep link for the current values (the link under the QR code follows what is typed). */
export function currentDeepLink(state: OtpState): string {
  return buildDeepLink({
    ...state.host,
    otp: codeText(state.code),
    passphrase: state.passphrase,
    hostName: state.hostName,
  });
}

/** The QR code and the link are shown while the host is edited, or once an OTP has an address to point to. */
export function showsDeepLink(state: OtpState): boolean {
  return state.editingHost || (state.code.kind === 'otp' && state.host.hostAddr !== '');
}

export function messageStatus(message: OtpMessage): 'success' | 'danger' | 'warning' {
  switch (message.kind) {
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    case 'expired':
      return 'warning';
  }
}

/** State of the OTP tab, with the transitions of the legacy page. */
export function otpReducer(state: OtpState, action: OtpAction): OtpState {
  switch (action.type) {
    case 'reset':
      return INITIAL_OTP_STATE;
    case 'passphraseChanged':
      return { ...state, passphrase: action.value };
    case 'deviceNameChanged':
      return { ...state, deviceName: action.value };
    case 'hostAddrChanged':
      return { ...state, host: { ...state.host, hostAddr: action.value } };
    case 'hostPortChanged':
      return { ...state, host: { ...state.host, hostPort: action.value } };
    case 'failed':
      // An answer without `message` hides the alert, as on the legacy page.
      return { ...state, message: action.message ? { kind: 'error', text: action.message } : null };
    case 'succeeded': {
      const next: OtpState = {
        ...state,
        code: { kind: 'otp', value: action.otp },
        hostName: action.hostName,
        host: action.host,
        message: { kind: 'success' },
      };
      return action.host.hostAddr ? { ...next, qrLink: currentDeepLink(next) } : next;
    }
    case 'expired':
      return { ...INITIAL_OTP_STATE, code: { kind: 'expired' }, message: { kind: 'expired' } };
    case 'hostEditingToggled':
      return { ...state, editingHost: !state.editingHost, host: action.cached ?? state.host };
    case 'hostSaved':
      if (!canSaveHost(state.host)) {
        return state;
      }
      return { ...state, editingHost: false, qrLink: currentDeepLink(state) };
  }
}
