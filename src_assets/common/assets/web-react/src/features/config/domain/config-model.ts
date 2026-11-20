import { AppError, type Platform } from '@/shared/kernel';
import type { ConfigTab, OptionValue } from './config-tabs';

/** A row of `global_prep_cmd` / `global_state_cmd` (`elevated` exists only on Windows). */
export type PrepCommand = {
  do?: string;
  undo?: string;
  elevated?: boolean;
};

/** A row of `server_cmd` (`elevated` exists only on Windows). */
export type ServerCommand = {
  name?: string;
  cmd?: string;
  elevated?: boolean;
};

/** `dd_mode_remapping`: display mode remapping lists of the display device options. */
export interface DisplayModeRemapping {
  mixed: OptionValue[];
  resolution_only: OptionValue[];
  refresh_rate_only: OptionValue[];
}

/** The options the page parses from JSON strings and keeps as structured values. */
export interface SpecialOptions {
  dd_mode_remapping: DisplayModeRemapping;
  global_prep_cmd: PrepCommand[];
  global_state_cmd: PrepCommand[];
  server_cmd: ServerCommand[];
}

/**
 * The editable configuration: every option of the config file as the server sent it (strings), the special options
 * parsed, and the defaults of the shown tabs for every missing option. It is what the tab components read.
 */
export type ConfigModel = SpecialOptions & { readonly [option: string]: unknown };

export type OptionKey = keyof SpecialOptions | (string & {});

/** Value type accepted for an option key (structured for the special options, anything else otherwise). */
export type OptionValueOf<K extends string> = K extends keyof SpecialOptions ? SpecialOptions[K] : unknown;

/** Virtual display driver status reported by the host (Windows only; the legacy default is `"1"`). */
export type VdisplayStatus = unknown;

export const SPECIAL_OPTIONS = ['dd_mode_remapping', 'global_prep_cmd', 'global_state_cmd', 'server_cmd'] as const;

/** Keys of `GET /api/config` that are metadata and never part of the model. */
const DROPPED_KEYS = ['platform', 'status', 'version'] as const;

export interface LoadedConfig {
  config: ConfigModel;
  /** Passed to the Audio/Video tab. */
  vdisplayStatus: VdisplayStatus;
  /** Last valid `fallback_mode`, restored when the user saves an invalid one. */
  fallbackModeCache: string | undefined;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseSpecialOption(key: string, value: unknown): unknown {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch (cause) {
    throw new AppError('parse', `Invalid JSON in the option ${key}`, { cause, body: value });
  }
}

function withElevated<T extends { elevated?: unknown }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, elevated: !!row.elevated }));
}

/**
 * Build the editable model from the `GET /api/config` body (legacy `created()`), for the tabs already filtered by
 * platform. Throws an AppError of kind `parse` when a special option holds invalid JSON (the legacy page stayed blank).
 */
export function parseLoadedConfig(
  dto: Readonly<Record<string, unknown>>,
  platform: Platform,
  tabs: readonly ConfigTab[],
): LoadedConfig {
  const raw: Record<string, unknown> = { ...dto };
  for (const key of DROPPED_KEYS) {
    delete raw[key];
  }
  const vdisplayStatus = raw['vdisplayStatus'];
  delete raw['vdisplayStatus'];

  const fallbackMode = raw['fallback_mode'];
  const fallbackModeCache = (fallbackMode as string | undefined) || '';

  for (const key of SPECIAL_OPTIONS) {
    raw[key] = parseSpecialOption(key, raw[key]);
  }
  raw['dd_mode_remapping'] ??= { mixed: [], resolution_only: [], refresh_rate_only: [] };
  raw['global_prep_cmd'] ??= [];
  raw['global_state_cmd'] ??= [];
  raw['server_cmd'] ??= [];

  for (const tab of tabs) {
    for (const [key, value] of Object.entries(tab.options)) {
      if (raw[key] === undefined) {
        raw[key] = deepCopy(value);
      }
    }
  }

  if (platform === 'windows') {
    raw['global_prep_cmd'] = withElevated(raw['global_prep_cmd'] as PrepCommand[]);
    raw['global_state_cmd'] = withElevated(raw['global_state_cmd'] as PrepCommand[]);
    raw['server_cmd'] = withElevated(raw['server_cmd'] as ServerCommand[]);
  }

  return { config: raw as ConfigModel, vdisplayStatus, fallbackModeCache };
}

const DISPLAY_MODE = /^\d+x\d+x\d+$/;

/** Legacy `cmd.do && cmd.do.trim()`: a non-empty string after trimming. */
function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export interface SerializedConfig {
  /** Body of `POST /api/config`. */
  payload: Record<string, unknown>;
  /** The model after the fallback mode guard (an invalid `fallback_mode` is put back to the last valid value). */
  config: ConfigModel;
  fallbackModeCache: string | undefined;
}

/**
 * Legacy `serialize()` + the default stripping of `save()`:
 * 1. an invalid `fallback_mode` (not `WxHxR`) is restored from the cache, a valid one (or empty) becomes the cache;
 * 2. deep copy; command rows without content are dropped;
 * 3. every option of the given tabs whose JSON equals its default is removed. The legacy page loops over the tabs
 *    after the platform filter, so the options of hidden tabs are always sent.
 */
export function serializeConfig(
  config: ConfigModel,
  fallbackModeCache: string | undefined,
  tabs: readonly ConfigTab[],
): SerializedConfig {
  let model = config;
  let cache = fallbackModeCache;
  const fallbackMode = config['fallback_mode'];
  if (fallbackMode && !DISPLAY_MODE.test(String(fallbackMode))) {
    model = { ...config, fallback_mode: cache };
  } else {
    cache = fallbackMode as string | undefined;
  }

  const copy = deepCopy(model);
  const payload: Record<string, unknown> = {
    ...copy,
    global_prep_cmd: copy.global_prep_cmd.filter((cmd) => hasText(cmd.do) || hasText(cmd.undo)),
    global_state_cmd: copy.global_state_cmd.filter((cmd) => hasText(cmd.do) || hasText(cmd.undo)),
    server_cmd: copy.server_cmd.filter((cmd) => hasText(cmd.name) && hasText(cmd.cmd)),
  };

  for (const tab of tabs) {
    for (const [key, value] of Object.entries(tab.options)) {
      if (JSON.stringify(payload[key]) === JSON.stringify(value)) {
        delete payload[key];
      }
    }
  }

  return { payload, config: model, fallbackModeCache: cache };
}
