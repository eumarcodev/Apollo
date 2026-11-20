/** The two pairing methods of the PIN page; OTP is the default. */
export type PairingTab = 'OTP' | 'PIN';

export const PAIRING_TABS: readonly PairingTab[] = ['OTP', 'PIN'];

/** Active tab from `location.hash`, as on the legacy page: `#PIN` is the PIN tab, anything else (or none) is OTP. */
export function tabFromHash(hash: string): PairingTab {
  return hash === '#PIN' ? 'PIN' : 'OTP';
}

export function isPairingTab(value: unknown): value is PairingTab {
  return value === 'OTP' || value === 'PIN';
}
