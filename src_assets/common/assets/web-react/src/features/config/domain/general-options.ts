import type { Platform } from '@/shared/kernel';
import type { PrepCommand, ServerCommand } from './config-model';

/** A choice of a select option. `label` is an i18n key unless `raw` is set (then it is shown as it is). */
export interface SelectChoice {
  value: string;
  label: string;
  raw?: boolean;
}

/** The locales of the Helios web UI (the only ones with a translation file). */
export const LOCALE_CHOICES: readonly SelectChoice[] = [
  { value: 'en', label: 'react_ui.locale_en' },
  { value: 'pt_BR', label: 'react_ui.locale_pt_BR' },
];

/**
 * Locale choices for the loaded value. A value outside the offered locales (e.g. `de`, still accepted by the server) is
 * added with its raw code, so that saving the page does not silently change it.
 */
export function localeChoices(current: unknown): SelectChoice[] {
  const value = typeof current === 'string' ? current : '';
  if (value === '' || LOCALE_CHOICES.some((choice) => choice.value === value)) {
    return [...LOCALE_CHOICES];
  }
  return [...LOCALE_CHOICES, { value, label: value, raw: true }];
}

/** `min_log_level` 0..6 (legacy option values are strings). */
export const LOG_LEVEL_CHOICES: readonly SelectChoice[] = [0, 1, 2, 3, 4, 5, 6].map((level) => ({
  value: String(level),
  label: `config.min_log_level_${level}`,
}));

export const UPDATE_CHANNEL_CHOICES: readonly SelectChoice[] = [
  { value: '', label: 'config.update_channel_auto' },
  { value: 'stable', label: 'config.update_channel_stable' },
  { value: 'rc', label: 'config.update_channel_rc' },
  { value: 'nightly', label: 'config.update_channel_nightly' },
];

/** Where "Learn More" of the server commands points (the docs of the Helios repository). */
export const SERVER_COMMANDS_DOCS_URL = 'https://github.com/eumarcodev/Helios-Server/tree/master/docs';

/** New row of the prep/state command lists (legacy `prepCmdTemplate`; `elevated` only on Windows). */
export function createPrepCommand(platform: Platform): PrepCommand {
  return platform === 'windows' ? { do: '', undo: '', elevated: false } : { do: '', undo: '' };
}

/** New row of the server commands (legacy `serverCmdTemplate`; `elevated` only on Windows). */
export function createServerCommand(platform: Platform): ServerCommand {
  return platform === 'windows' ? { name: '', cmd: '', elevated: false } : { name: '', cmd: '' };
}
