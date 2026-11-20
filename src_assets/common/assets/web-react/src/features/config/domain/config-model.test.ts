import { describe, expect, it } from 'vitest';
import { AppError } from '@/shared/kernel';
import { parseLoadedConfig, serializeConfig, type ConfigModel } from './config-model';
import { CONFIG_TABS, visibleTabs } from './config-tabs';

const windowsTabs = visibleTabs('windows');
const linuxTabs = visibleTabs('linux');

function dto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: true,
    platform: 'windows',
    version: '1.2.3',
    update_repo: 'eumarcodev/Helios-Server',
    vdisplayStatus: 0,
    locale: 'en',
    sunshine_name: 'Host',
    min_log_level: '2',
    ...overrides,
  };
}

describe('parseLoadedConfig', () => {
  it('drops the metadata, keeps vdisplayStatus aside and keeps the other server keys', () => {
    const { config, vdisplayStatus } = parseLoadedConfig(dto({ vdisplayStatus: 3 }), 'windows', windowsTabs);
    expect(vdisplayStatus).toBe(3);
    for (const key of ['status', 'platform', 'version', 'vdisplayStatus']) {
      expect(config).not.toHaveProperty(key);
    }
    // Not removed by the legacy page either: it goes back to the server on save.
    expect(config['update_repo']).toBe('eumarcodev/Helios-Server');
    expect(config['sunshine_name']).toBe('Host');
    expect(config['min_log_level']).toBe('2');
  });

  it('fills every missing option of the shown tabs with a copy of its default', () => {
    const { config } = parseLoadedConfig(dto(), 'windows', windowsTabs);
    expect(config['port']).toBe(47989);
    expect(config['key_repeat_frequency']).toBe(24.9);
    expect(config['nvenc_twopass']).toBe('quarter_res');
    expect(config['vt_coder']).toBeUndefined();
    expect(config['vaapi_strict_rc_buffer']).toBeUndefined();
    expect(config.dd_mode_remapping).toEqual({ mixed: [], resolution_only: [], refresh_rate_only: [] });
    expect(config.dd_mode_remapping).not.toBe(CONFIG_TABS[2]!.options['dd_mode_remapping']);
  });

  it('parses the special options from JSON strings and resets other types to the defaults', () => {
    const prep = [{ do: 'a', undo: 'b', elevated: 'true' }];
    const { config } = parseLoadedConfig(
      dto({
        global_prep_cmd: JSON.stringify(prep),
        global_state_cmd: [{ do: 'ignored' }],
        server_cmd: JSON.stringify([{ name: 'n', cmd: 'c' }]),
        dd_mode_remapping: JSON.stringify({
          mixed: [{ requested_fps: '60' }],
          resolution_only: [],
          refresh_rate_only: [],
        }),
      }),
      'linux',
      linuxTabs,
    );
    expect(config.global_prep_cmd).toEqual(prep);
    expect(config.global_state_cmd).toEqual([]);
    expect(config.server_cmd).toEqual([{ name: 'n', cmd: 'c' }]);
    expect(config.dd_mode_remapping.mixed).toEqual([{ requested_fps: '60' }]);
  });

  it('uses the defaults when a special option is the JSON null', () => {
    const { config } = parseLoadedConfig(dto({ server_cmd: 'null', dd_mode_remapping: 'null' }), 'linux', linuxTabs);
    expect(config.server_cmd).toEqual([]);
    expect(config.dd_mode_remapping).toEqual({ mixed: [], resolution_only: [], refresh_rate_only: [] });
  });

  it('normalises elevated to a boolean on Windows only', () => {
    const body = dto({
      global_prep_cmd: JSON.stringify([{ do: 'a' }, { do: 'b', elevated: 'false' }, { do: 'c', elevated: true }]),
      global_state_cmd: JSON.stringify([{ do: 's', elevated: 0 }]),
      server_cmd: JSON.stringify([{ name: 'n', cmd: 'c' }]),
    });
    const windows = parseLoadedConfig(body, 'windows', windowsTabs).config;
    expect(windows.global_prep_cmd.map((row) => row.elevated)).toEqual([false, true, true]);
    expect(windows.global_state_cmd[0]!.elevated).toBe(false);
    expect(windows.server_cmd[0]!.elevated).toBe(false);
    const linux = parseLoadedConfig(body, 'linux', linuxTabs).config;
    expect(linux.global_prep_cmd[0]).not.toHaveProperty('elevated');
    expect(linux.global_prep_cmd[1]!.elevated).toBe('false');
  });

  it('remembers the loaded fallback mode', () => {
    expect(parseLoadedConfig(dto({ fallback_mode: '1920x1080x60' }), 'windows', windowsTabs).fallbackModeCache).toBe(
      '1920x1080x60',
    );
    expect(parseLoadedConfig(dto(), 'windows', windowsTabs).fallbackModeCache).toBe('');
  });

  it('fails with a parse error on invalid JSON', () => {
    expect(() => parseLoadedConfig(dto({ server_cmd: '[{' }), 'windows', windowsTabs)).toThrow(AppError);
  });
});

function load(overrides: Record<string, unknown> = {}, platform: 'windows' | 'linux' = 'windows') {
  return parseLoadedConfig(dto(overrides), platform, platform === 'windows' ? windowsTabs : linuxTabs);
}

describe('serializeConfig', () => {
  it('sends only the options that differ from the defaults (and the non-tab keys)', () => {
    const { config, fallbackModeCache } = load();
    const { payload } = serializeConfig(config, fallbackModeCache, windowsTabs);
    expect(payload).toEqual({
      update_repo: 'eumarcodev/Helios-Server',
      sunshine_name: 'Host',
      // The server answers strings: "2" !== 2, so the legacy page sends it back (JSON.stringify comparison).
      min_log_level: '2',
    });
  });

  it('strips by JSON equality, so a changed value is sent and a reverted one is not', () => {
    const { config, fallbackModeCache } = load();
    const changed: ConfigModel = { ...config, port: 48000, locale: 'en', qp: 28 };
    const { payload } = serializeConfig(changed, fallbackModeCache, windowsTabs);
    expect(payload['port']).toBe(48000);
    expect(payload).not.toHaveProperty('locale');
    expect(payload).not.toHaveProperty('qp');
  });

  it('keeps the options of the tabs hidden by the platform filter (legacy loop over the shown tabs)', () => {
    const { config, fallbackModeCache } = load({ vt_coder: 'auto', amd_usage: 'ultralowlatency' }, 'linux');
    const { payload } = serializeConfig(config, fallbackModeCache, linuxTabs);
    expect(payload['vt_coder']).toBe('auto');
    expect(payload['amd_usage']).toBe('ultralowlatency');
    expect(payload).not.toHaveProperty('vaapi_strict_rc_buffer');
  });

  it('keeps command rows with content only', () => {
    const { config, fallbackModeCache } = load();
    const model: ConfigModel = {
      ...config,
      global_prep_cmd: [
        { do: '  ', undo: '', elevated: false },
        { do: 'start', undo: '', elevated: true },
        { do: '', undo: 'stop', elevated: false },
        {},
      ],
      global_state_cmd: [{ do: '', undo: ' ' }, { undo: 'only undo' }],
      server_cmd: [
        { name: 'n', cmd: ' ', elevated: false },
        { name: ' ', cmd: 'c' },
        { name: 'ok', cmd: 'run', elevated: true },
        { cmd: 'no name' },
      ],
    };
    const { payload } = serializeConfig(model, fallbackModeCache, windowsTabs);
    expect(payload['global_prep_cmd']).toEqual([
      { do: 'start', undo: '', elevated: true },
      { do: '', undo: 'stop', elevated: false },
    ]);
    expect(payload['global_state_cmd']).toEqual([{ undo: 'only undo' }]);
    expect(payload['server_cmd']).toEqual([{ name: 'ok', cmd: 'run', elevated: true }]);
  });

  it('removes empty command lists and an untouched remapping as defaults', () => {
    const { config, fallbackModeCache } = load();
    const model: ConfigModel = { ...config, global_prep_cmd: [{ do: '', undo: '' }] };
    const { payload } = serializeConfig(model, fallbackModeCache, windowsTabs);
    for (const key of ['global_prep_cmd', 'global_state_cmd', 'server_cmd', 'dd_mode_remapping']) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('sends a remapping that differs from the default (key order matters, as in JSON.stringify)', () => {
    const { config, fallbackModeCache } = load({
      dd_mode_remapping: JSON.stringify({ resolution_only: [], mixed: [], refresh_rate_only: [] }),
    });
    const { payload } = serializeConfig(config, fallbackModeCache, windowsTabs);
    expect(payload['dd_mode_remapping']).toEqual({ resolution_only: [], mixed: [], refresh_rate_only: [] });
  });

  it('restores the last valid fallback mode when the current one is invalid', () => {
    const { config, fallbackModeCache } = load({ fallback_mode: '1920x1080x60' });
    const result = serializeConfig({ ...config, fallback_mode: '1920x1080' }, fallbackModeCache, windowsTabs);
    expect(result.config['fallback_mode']).toBe('1920x1080x60');
    expect(result.payload['fallback_mode']).toBe('1920x1080x60');
    expect(result.fallbackModeCache).toBe('1920x1080x60');
  });

  it('remembers a valid fallback mode for the next save', () => {
    const { config, fallbackModeCache } = load({ fallback_mode: '1920x1080x60' });
    const first = serializeConfig({ ...config, fallback_mode: '2560x1440x120' }, fallbackModeCache, windowsTabs);
    expect(first.fallbackModeCache).toBe('2560x1440x120');
    expect(first.payload['fallback_mode']).toBe('2560x1440x120');
    const second = serializeConfig({ ...first.config, fallback_mode: 'bad' }, first.fallbackModeCache, windowsTabs);
    expect(second.payload['fallback_mode']).toBe('2560x1440x120');
  });

  it('accepts an empty fallback mode and strips it as the default', () => {
    const { config } = load({ fallback_mode: '1920x1080x60' });
    const result = serializeConfig({ ...config, fallback_mode: '' }, '1920x1080x60', windowsTabs);
    expect(result.fallbackModeCache).toBe('');
    expect(result.payload).not.toHaveProperty('fallback_mode');
  });

  it('does not mutate the model it serialises', () => {
    const { config, fallbackModeCache } = load({ global_prep_cmd: JSON.stringify([{ do: '' }]) });
    const before = JSON.stringify(config);
    serializeConfig(config, fallbackModeCache, windowsTabs);
    expect(JSON.stringify(config)).toBe(before);
  });
});
