/**
 * Port math of the Network tab, ported from the legacy `configs/tabs/Network.vue`.
 *
 * Helios derives every port it uses from the base port (`port`, default 47989). The legacy page does the same
 * arithmetic in the template; here it lives in the domain so it can be unit tested.
 */

/** Base port of Moonlight (`port` default). The HTTP note appears when the effective port differs from it. */
export const DEFAULT_MOONLIGHT_PORT = 47989;

/** Bounds of the `port` input (legacy `min`/`max`). */
export const PORT_MIN = 1029;
export const PORT_MAX = 65514;

/** Lowest port Helios can bind (the TCP port `port - 5` must stay at or above it). */
const LOWEST_USABLE_PORT = 1024;
/** Highest port number of the TCP/UDP range. */
const HIGHEST_PORT_NUMBER = 65535;

export type NetworkProtocol = 'tcp' | 'udp';

/** What a row of the port table is for; the UI maps it to a translation key. */
export type NetworkPortPurpose = 'https' | 'http' | 'web_ui' | 'rtsp' | 'media';

export interface NetworkPortRow {
  protocol: NetworkProtocol;
  purpose: NetworkPortPurpose;
  /** First port of the row. */
  from: number;
  /** Last port of the row (equal to `from` for a single port). */
  to: number;
}

export interface NetworkPortAlerts {
  /** `port - 5` is below 1024. */
  lowPort: boolean;
  /** `port + 21` is above 65535. */
  highPort: boolean;
}

/**
 * Base port used for the arithmetic, read like the legacy `+config.port` (a number or a numeric string).
 * An empty or non-numeric value gives `0` or `NaN`, exactly what the legacy page computes.
 */
export function effectivePort(value: unknown): number {
  return Number(value);
}

/** The port table rows for a base port, in the legacy order (the commented-out Mic row is not shown). */
export function networkPortRows(port: number): NetworkPortRow[] {
  return [
    { protocol: 'tcp', purpose: 'https', from: port - 5, to: port - 5 },
    { protocol: 'tcp', purpose: 'http', from: port, to: port },
    { protocol: 'tcp', purpose: 'web_ui', from: port + 1, to: port + 1 },
    { protocol: 'tcp', purpose: 'rtsp', from: port + 21, to: port + 21 },
    { protocol: 'udp', purpose: 'media', from: port + 9, to: port + 11 },
  ];
}

/** Whether the port table needs the "use this port with Moonlight" note (any base port other than the default). */
export function needsHttpPortNote(port: number): boolean {
  return port !== DEFAULT_MOONLIGHT_PORT;
}

/** Danger alerts of the port field, same comparisons as the legacy template. */
export function networkPortAlerts(port: number): NetworkPortAlerts {
  return {
    lowPort: port - 5 < LOWEST_USABLE_PORT,
    highPort: port + 21 > HIGHEST_PORT_NUMBER,
  };
}
