import type { Platform } from '@/shared/kernel';
import type { AppEntry } from './app-entry';

/** A value of the `gamepad` override select with the translation key of its label. */
export interface GamepadOption {
  value: string;
  labelKey: string;
}

/** Fields the list page adds to an app in memory; the legacy `save` deletes them before posting. */
const TRANSIENT_FIELDS = ['id', 'launching', 'dragover'] as const;

/** The gamepad override is not offered on macOS (legacy `v-if="platform !== 'macos'"`). */
export function hasGamepadOverride(platform: Platform | null): boolean {
  return platform !== 'macos';
}

/** Options of the per-app gamepad override, in the legacy order; `""` keeps the global setting. */
export function gamepadOptions(platform: Platform | null): GamepadOption[] {
  const options: GamepadOption[] = [
    { value: '', labelKey: '_common.default_global' },
    { value: 'disabled', labelKey: '_common.disabled' },
    { value: 'auto', labelKey: '_common.auto' },
  ];
  if (platform === 'linux') {
    options.push(
      { value: 'ds5', labelKey: 'config.gamepad_ds5' },
      { value: 'switch', labelKey: 'config.gamepad_switch' },
      { value: 'xone', labelKey: 'config.gamepad_xone' },
    );
  }
  if (platform === 'windows') {
    options.push({ value: 'ds4', labelKey: 'config.gamepad_ds4' }, { value: 'x360', labelKey: 'config.gamepad_x360' });
  }
  return options;
}

/** A prep/state command row of an app. */
export interface AppCommand {
  do: string;
  undo: string;
  elevated?: boolean;
  [field: string]: unknown;
}

/** New prep/state row (legacy `addCmd`): `elevated: false` only on Windows. */
export function newAppCommand(platform: Platform | null): AppCommand {
  return platform === 'windows' ? { do: '', undo: '', elevated: false } : { do: '', undo: '' };
}

export type CommandListType = 'prep' | 'state';

export const COMMAND_LIST_TYPES: readonly CommandListType[] = ['prep', 'state'];

/** The array stored under `key`, or an empty one when the field is missing or not an array. */
export function listField<T>(app: AppEntry, key: string): T[] {
  const value = app[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Resolution scale factor slider bounds (Windows only). */
export const SCALE_FACTOR = { min: 20, max: 200, step: 1 } as const;

/** Slider position for the stored value; non-numeric values sit on the template default. */
export function scaleFactorValue(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 100 : parsed;
}

/** `parseInt(value)`, or the fallback when it is blank or not a number (0 is kept). */
function intOr(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** The name the editor saves: the trimmed name, or null when it is blank (the save button is disabled then). */
export function savableName(app: AppEntry): string | null {
  const name = String(app.name ?? '').trim();
  return name === '' ? null : name;
}

/**
 * Body of `POST ./api/apps`, normalised like the legacy `save()`: trimmed name, integer exit timeout (default 5)
 * and scale factor (default 100), image path trimmed without double quotes, and the in-memory list fields removed.
 * A new app has no uuid yet, so the empty one is dropped (the host generates it). Null when the name is blank.
 */
export function buildSavePayload(app: AppEntry): Record<string, unknown> | null {
  const name = savableName(app);
  if (name === null) {
    return null;
  }
  const payload: Record<string, unknown> = {
    ...app,
    name,
    'exit-timeout': intOr(app['exit-timeout'], 5),
    'scale-factor': intOr(app['scale-factor'], 100),
    'image-path': String(app['image-path'] ?? '')
      .trim()
      .replace(/"/g, ''),
  };
  for (const field of TRANSIENT_FIELDS) {
    delete payload[field];
  }
  if (payload['uuid'] === '') {
    delete payload['uuid'];
  }
  return payload;
}
