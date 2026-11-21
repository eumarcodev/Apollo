import { describe, expect, it } from 'vitest';
import type { DisplayModeRemapping } from './config-model';
import {
  addRemappingRow,
  canBeRemapped,
  editRemappingRow,
  getRemappingType,
  newRemappingEntry,
  remappingColumns,
  remappingHelpKeys,
  removeRemappingRow,
} from './display-device';

const state = (configuration: string, resolution: string, refresh: string) => ({
  dd_configuration_option: configuration,
  dd_resolution_option: resolution,
  dd_refresh_rate_option: refresh,
});

const empty = (): DisplayModeRemapping => ({ mixed: [], resolution_only: [], refresh_rate_only: [] });

describe('canBeRemapped', () => {
  it('needs an auto option and an active configuration', () => {
    expect(canBeRemapped(state('ensure_active', 'auto', 'manual'))).toBe(true);
    expect(canBeRemapped(state('verify_only', 'manual', 'auto'))).toBe(true);
    expect(canBeRemapped(state('ensure_active', 'manual', 'disabled'))).toBe(false);
    expect(canBeRemapped(state('disabled', 'auto', 'auto'))).toBe(false);
  });
});

describe('getRemappingType', () => {
  it('is refresh_rate_only when the resolution is not auto', () => {
    expect(getRemappingType(state('ensure_active', 'manual', 'auto'))).toBe('refresh_rate_only');
    expect(getRemappingType(state('ensure_active', 'disabled', 'disabled'))).toBe('refresh_rate_only');
  });
  it('is resolution_only when only the refresh rate is not auto', () => {
    expect(getRemappingType(state('ensure_active', 'auto', 'manual'))).toBe('resolution_only');
  });
  it('is mixed when both are auto', () => {
    expect(getRemappingType(state('ensure_active', 'auto', 'auto'))).toBe('mixed');
  });
});

describe('entry templates and columns', () => {
  it('mixed has the four fields', () => {
    expect(newRemappingEntry('mixed')).toEqual({
      requested_fps: '',
      final_refresh_rate: '',
      requested_resolution: '',
      final_resolution: '',
    });
    expect(remappingColumns('mixed')).toEqual([
      'requested_resolution',
      'requested_fps',
      'final_resolution',
      'final_refresh_rate',
    ]);
  });
  it('resolution_only has no fps fields', () => {
    expect(newRemappingEntry('resolution_only')).toEqual({ requested_resolution: '', final_resolution: '' });
    expect(remappingColumns('resolution_only')).toEqual(['requested_resolution', 'final_resolution']);
  });
  it('refresh_rate_only has no resolution fields', () => {
    expect(newRemappingEntry('refresh_rate_only')).toEqual({ requested_fps: '', final_refresh_rate: '' });
    expect(remappingColumns('refresh_rate_only')).toEqual(['requested_fps', 'final_refresh_rate']);
  });
});

describe('row editing', () => {
  it('adds, edits and removes rows without mutating the input', () => {
    const base = empty();
    const added = addRemappingRow(base, 'resolution_only');
    expect(base.resolution_only).toEqual([]);
    expect(added.resolution_only).toEqual([{ requested_resolution: '', final_resolution: '' }]);
    const edited = editRemappingRow(added, 'resolution_only', 0, 'final_resolution', '2560x1440');
    expect(edited.resolution_only).toEqual([{ requested_resolution: '', final_resolution: '2560x1440' }]);
    expect(added.resolution_only[0]).toEqual({ requested_resolution: '', final_resolution: '' });
    const two = addRemappingRow(edited, 'resolution_only');
    expect(removeRemappingRow(two, 'resolution_only', 0).resolution_only).toEqual([
      { requested_resolution: '', final_resolution: '' },
    ]);
    expect(two.mixed).toBe(base.mixed);
  });
  it('treats a missing list as empty', () => {
    const partial = { mixed: [] } as unknown as DisplayModeRemapping;
    expect(addRemappingRow(partial, 'refresh_rate_only').refresh_rate_only).toHaveLength(1);
  });
});

describe('remappingHelpKeys', () => {
  it('picks the final-values and Optimize-game-settings lines per type', () => {
    expect(remappingHelpKeys('mixed')).toContain('config.dd_mode_remapping_desc_4_final_values_mixed');
    expect(remappingHelpKeys('mixed')).toContain('config.dd_mode_remapping_desc_5_sops_mixed_only');
    expect(remappingHelpKeys('resolution_only')).toContain('config.dd_mode_remapping_desc_5_sops_resolution_only');
    expect(remappingHelpKeys('refresh_rate_only')).toHaveLength(4);
    expect(remappingHelpKeys('refresh_rate_only')).toContain('config.dd_mode_remapping_desc_4_final_values_non_mixed');
  });
});
