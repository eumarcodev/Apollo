import type { HostInfo } from '@/features/pairing/domain/host-address';

export interface PinRequest {
  pin: string;
  name: string;
}

export interface OtpRequest {
  passphrase: string;
  deviceName: string;
}

/** `POST ./api/otp` answer: the OTP with the host address and name, or the refusal message (absent on a 400). */
export type OtpAnswer = { ok: true; otp: string; ip: string; hostName: string } | { ok: false; message?: string };

/** Pairing endpoints of the host. Rejects only when the request itself failed (network, session, invalid JSON). */
export interface PairingPort {
  /** `POST ./api/pin`; true when the host accepted the PIN. */
  sendPin(request: PinRequest): Promise<boolean>;
  requestOtp(request: OtpRequest): Promise<OtpAnswer>;
}

/** Host typed by hand in this browser session (`sessionStorage.hostInfo`). */
export interface HostInfoStore {
  load(): HostInfo | null;
  save(info: HostInfo): void;
}

/** What the page needs from the browser: its address, the tab in the hash, and opening the deep link. */
export interface PageEnvironment {
  hostname(): string;
  port(): string;
  hash(): string;
  setHash(hash: string): void;
  openLink(url: string): void;
}
