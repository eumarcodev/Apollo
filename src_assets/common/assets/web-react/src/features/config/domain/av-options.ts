import type { Platform } from '@/shared/kernel';

/** Live validation of the fallback display mode field (legacy `AudioVideo.vue`; the decimal refresh rate is allowed). */
export const FALLBACK_MODE_LIVE_PATTERN = /^\d+x\d+x\d+(\.\d+)?$/;

/** True when the typed fallback mode matches the live pattern (the save guard in `serializeConfig` is stricter). */
export function isValidFallbackModeInput(value: string): boolean {
  return FALLBACK_MODE_LIVE_PATTERN.test(value);
}

/** Virtual display driver (SudoVDA) states reported by the host, keyed by the status value as a string. */
const VDISPLAY_STATUS_KEYS: Readonly<Record<string, string>> = {
  '1': 'unknown',
  '0': 'ready',
  '-1': 'uninitialized',
  '-2': 'version_incompatible',
  '-3': 'watchdog_failed',
};

/** Name of the driver state (`ready`, `unknown`...) or `null` when the host reported something else. */
export function vdisplayStatusName(status: unknown): string | null {
  if (status === null || status === undefined) {
    return null;
  }
  return VDISPLAY_STATUS_KEYS[String(status)] ?? null;
}

/**
 * Legacy `vdisplay ? 'alert-warning' : 'alert-success'`: JavaScript truthiness, so the string `'0'` counts as a
 * problem while the number `0` (what the host sends) does not. Kept on purpose.
 */
export function isVdisplayWarning(status: unknown): boolean {
  return Boolean(status);
}

/** Legacy `v-model` on `<input type="number">`: a numeric string becomes a number, anything else stays as typed. */
export function parseNumberInput(text: string): number | string {
  const parsed = parseFloat(text);
  return Number.isNaN(parsed) ? text : parsed;
}

/** Text shown in an input for an option value that may be missing. */
export function optionText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/** Placeholder of the output (display) name field. */
export function outputNamePlaceholder(platform: Platform): string {
  return platform === 'windows' ? '{de9bb7e2-186e-505b-9e93-f48793333810}' : '0';
}
