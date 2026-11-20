/** Address and port a client uses to reach this host, as stored in `sessionStorage.hostInfo`. */
export interface HostInfo {
  hostAddr: string;
  hostPort: string;
}

/** Hostnames that mean "this machine": the OTP deep link then uses the address the host reports instead. */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

/** The web UI listens on the streaming port + 1, so the client port is the page port - 1 (legacy `parseInt`). */
export function streamingPortFromPage(pagePort: string): string {
  return String(Number.parseInt(pagePort, 10) - 1);
}

export interface AutomaticHostInput {
  /** `ip` of the `POST /api/otp` answer (the local address of the gateway route). */
  reportedIp: string;
  pageHostname: string;
  pagePort: string;
}

/**
 * Host used when the user did not set one in this session: the reported address when the page is opened on this
 * machine, otherwise the hostname the browser used to reach the page; the port is always derived from the page port.
 */
export function automaticHostInfo({ reportedIp, pageHostname, pagePort }: AutomaticHostInput): HostInfo {
  return {
    hostAddr: isLocalHostname(pageHostname) ? reportedIp : pageHostname,
    hostPort: streamingPortFromPage(pagePort),
  };
}

/** Both fields are needed to save a host typed by hand. */
export function canSaveHost({ hostAddr, hostPort }: HostInfo): boolean {
  return hostAddr !== '' && hostPort !== '';
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** Parse `sessionStorage.hostInfo`; anything that is not `{ hostAddr, hostPort }` counts as "not set". */
export function parseStoredHostInfo(raw: string | null): HostInfo | null {
  if (!raw) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const hostAddr = asText(record['hostAddr']);
  const hostPort = asText(record['hostPort']);
  return hostAddr === null || hostPort === null ? null : { hostAddr, hostPort };
}

export interface DeepLinkInput extends HostInfo {
  otp: string;
  passphrase: string;
  hostName: string;
}

/** `art://` deep link the Selene client opens to pair with an OTP (same scheme and encoding as the legacy page). */
export function buildDeepLink({ hostAddr, hostPort, otp, passphrase, hostName }: DeepLinkInput): string {
  return encodeURI(`art://${hostAddr}:${hostPort}?pin=${otp}&passphrase=${passphrase}&name=${hostName}`);
}

/** Text shown for the deep link (without the query, which carries the passphrase). */
export function deepLinkLabel({ hostAddr, hostPort }: HostInfo): string {
  return `art://${hostAddr}:${hostPort}`;
}
