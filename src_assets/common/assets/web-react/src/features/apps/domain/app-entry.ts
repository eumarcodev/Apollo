/**
 * An application of the host (`apps.json`). Only `uuid` and `name` matter to the list; every other field is kept as
 * received so the editor can round-trip it.
 */
export interface AppEntry {
  uuid: string;
  name: string;
  [field: string]: unknown;
}

/** Template of a new application (same defaults as the legacy `newApp` object). */
export const NEW_APP_TEMPLATE: Readonly<Record<string, unknown>> = {
  name: 'New App',
  output: '',
  cmd: '',
  'exclude-global-prep-cmd': false,
  'exclude-global-state-cmd': false,
  elevated: false,
  'auto-detach': true,
  'wait-all': true,
  'exit-timeout': 5,
  'prep-cmd': [],
  'state-cmd': [],
  detached: [],
  'image-path': '',
  'scale-factor': 100,
  'use-app-identity': false,
  'per-client-app-identity': false,
  'allow-client-commands': true,
  'virtual-display': false,
  'terminate-on-pause': false,
  gamepad: '',
};

/** A new application to edit: the template with an empty uuid (the host assigns it on save). */
export function newAppDraft(): AppEntry {
  return { ...(structuredClone(NEW_APP_TEMPLATE) as Record<string, unknown>), uuid: '', name: 'New App' };
}

/** Deep copy of an app merged over the new-app template, as the legacy `editApp` did. */
export function editDraft(app: AppEntry): AppEntry {
  return { ...newAppDraft(), ...(structuredClone(app) as AppEntry) };
}
