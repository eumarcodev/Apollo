import type { OptionValue } from './config-tabs';
import type { DisplayModeRemapping } from './config-model';
import type { SelectChoice } from './general-options';

/** Which remapping list applies: only one of resolution / refresh rate is "auto", or both. */
export type RemappingType = 'refresh_rate_only' | 'resolution_only' | 'mixed';

export type RemappingColumn = 'requested_resolution' | 'requested_fps' | 'final_resolution' | 'final_refresh_rate';

/** The subset of the config the display device rules read. */
export type DisplayDeviceState = Readonly<Record<string, unknown>>;

export const DD_CONFIGURATION_CHOICES: readonly SelectChoice[] = [
  { value: 'disabled', label: '_common.disabled_def' },
  { value: 'verify_only', label: 'config.dd_config_verify_only' },
  { value: 'ensure_active', label: 'config.dd_config_ensure_active' },
  { value: 'ensure_primary', label: 'config.dd_config_ensure_primary' },
  { value: 'ensure_only_display', label: 'config.dd_config_ensure_only_display' },
];

export const DD_RESOLUTION_CHOICES: readonly SelectChoice[] = [
  { value: 'disabled', label: 'config.dd_resolution_option_disabled' },
  { value: 'auto', label: 'config.dd_resolution_option_auto' },
  { value: 'manual', label: 'config.dd_resolution_option_manual' },
];

export const DD_REFRESH_RATE_CHOICES: readonly SelectChoice[] = [
  { value: 'disabled', label: 'config.dd_refresh_rate_option_disabled' },
  { value: 'auto', label: 'config.dd_refresh_rate_option_auto' },
  { value: 'manual', label: 'config.dd_refresh_rate_option_manual' },
];

export const DD_HDR_CHOICES: readonly SelectChoice[] = [
  { value: 'disabled', label: 'config.dd_hdr_option_disabled' },
  { value: 'auto', label: 'config.dd_hdr_option_auto' },
];

/** True while the display device configuration is active (anything but `disabled`, like the legacy check). */
export function isDisplayConfigured(state: DisplayDeviceState): boolean {
  return state.dd_configuration_option !== 'disabled';
}

/** Legacy `canBeRemapped()`: a value is requested from the client (auto) and the configuration is active. */
export function canBeRemapped(state: DisplayDeviceState): boolean {
  return (
    (state.dd_resolution_option === 'auto' || state.dd_refresh_rate_option === 'auto') && isDisplayConfigured(state)
  );
}

/** Legacy `getRemappingType()`: assumes at least one of the two options is "auto" when the other is not. */
export function getRemappingType(state: DisplayDeviceState): RemappingType {
  if (state.dd_resolution_option !== 'auto') {
    return 'refresh_rate_only';
  }
  if (state.dd_refresh_rate_option !== 'auto') {
    return 'resolution_only';
  }
  return 'mixed';
}

/** Columns of the remapping table, in display order (fps columns hidden for `resolution_only`, and so on). */
export function remappingColumns(type: RemappingType): RemappingColumn[] {
  const columns: RemappingColumn[] = [];
  if (type !== 'refresh_rate_only') {
    columns.push('requested_resolution');
  }
  if (type !== 'resolution_only') {
    columns.push('requested_fps');
  }
  if (type !== 'refresh_rate_only') {
    columns.push('final_resolution');
  }
  if (type !== 'resolution_only') {
    columns.push('final_refresh_rate');
  }
  return columns;
}

/** Legacy `addRemappingEntry()` template: the fields of the type, all empty. */
export function newRemappingEntry(type: RemappingType): Record<string, string> {
  const entry: Record<string, string> = {};
  if (type !== 'resolution_only') {
    entry['requested_fps'] = '';
    entry['final_refresh_rate'] = '';
  }
  if (type !== 'refresh_rate_only') {
    entry['requested_resolution'] = '';
    entry['final_resolution'] = '';
  }
  return entry;
}

/** The rows of one list (a missing list counts as empty). */
export function remappingRows(remapping: DisplayModeRemapping, type: RemappingType): OptionValue[] {
  return remapping[type] ?? [];
}

/** A copy of the remapping with one list replaced (the model is never mutated). */
function withRows(remapping: DisplayModeRemapping, type: RemappingType, rows: OptionValue[]): DisplayModeRemapping {
  return { ...remapping, [type]: rows };
}

export function addRemappingRow(remapping: DisplayModeRemapping, type: RemappingType): DisplayModeRemapping {
  return withRows(remapping, type, [...remappingRows(remapping, type), newRemappingEntry(type)]);
}

export function removeRemappingRow(
  remapping: DisplayModeRemapping,
  type: RemappingType,
  index: number,
): DisplayModeRemapping {
  return withRows(
    remapping,
    type,
    remappingRows(remapping, type).filter((_, i) => i !== index),
  );
}

export function editRemappingRow(
  remapping: DisplayModeRemapping,
  type: RemappingType,
  index: number,
  column: RemappingColumn,
  value: string,
): DisplayModeRemapping {
  return withRows(
    remapping,
    type,
    remappingRows(remapping, type).map((row, i) =>
      i === index && typeof row === 'object' && row !== null && !Array.isArray(row) ? { ...row, [column]: value } : row,
    ),
  );
}

/** Translation keys of the help lines under the remapping label. */
export function remappingHelpKeys(type: RemappingType): string[] {
  const keys = [
    'config.dd_mode_remapping_desc_1',
    'config.dd_mode_remapping_desc_2',
    'config.dd_mode_remapping_desc_3',
    type === 'mixed'
      ? 'config.dd_mode_remapping_desc_4_final_values_mixed'
      : 'config.dd_mode_remapping_desc_4_final_values_non_mixed',
  ];
  if (type === 'mixed') {
    keys.push('config.dd_mode_remapping_desc_5_sops_mixed_only');
  }
  if (type === 'resolution_only') {
    keys.push('config.dd_mode_remapping_desc_5_sops_resolution_only');
  }
  return keys;
}

export const REMAPPING_PLACEHOLDERS: Readonly<Record<RemappingColumn, string>> = {
  requested_resolution: '1920x1080',
  requested_fps: '60',
  final_resolution: '2560x1440',
  final_refresh_rate: '119.95',
};

export const REMAPPING_COLUMN_LABELS: Readonly<Record<RemappingColumn, string>> = {
  requested_resolution: 'config.dd_mode_remapping_requested_resolution',
  requested_fps: 'config.dd_mode_remapping_requested_fps',
  final_resolution: 'config.dd_mode_remapping_final_resolution',
  final_refresh_rate: 'config.dd_mode_remapping_final_refresh_rate',
};
