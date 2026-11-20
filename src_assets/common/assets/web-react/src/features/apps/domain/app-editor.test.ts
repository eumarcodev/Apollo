import { describe, expect, it } from 'vitest';
import {
  buildSavePayload,
  gamepadOptions,
  hasGamepadOverride,
  listField,
  newAppCommand,
  savableName,
  scaleFactorValue,
} from './app-editor';
import { editDraft, newAppDraft, NEW_APP_TEMPLATE } from './app-entry';
import { APP_ENV_VARS, APP_EXAMPLES_URL, envExample } from './env-vars';

describe('gamepad override', () => {
  it('is offered everywhere but macOS', () => {
    expect(hasGamepadOverride('windows')).toBe(true);
    expect(hasGamepadOverride('linux')).toBe(true);
    expect(hasGamepadOverride(null)).toBe(true);
    expect(hasGamepadOverride('macos')).toBe(false);
  });

  it('lists the legacy options per platform', () => {
    const values = (platform: Parameters<typeof gamepadOptions>[0]) => gamepadOptions(platform).map((o) => o.value);
    expect(values('windows')).toEqual(['', 'disabled', 'auto', 'ds4', 'x360']);
    expect(values('linux')).toEqual(['', 'disabled', 'auto', 'ds5', 'switch', 'xone']);
    expect(values(null)).toEqual(['', 'disabled', 'auto']);
    expect(gamepadOptions('windows')[0]?.labelKey).toBe('_common.default_global');
    expect(gamepadOptions('linux')[4]?.labelKey).toBe('config.gamepad_switch');
  });
});

describe('prep/state rows', () => {
  it('adds elevated: false only on Windows', () => {
    expect(newAppCommand('windows')).toEqual({ do: '', undo: '', elevated: false });
    expect(newAppCommand('linux')).toEqual({ do: '', undo: '' });
    expect(newAppCommand('macos')).toEqual({ do: '', undo: '' });
    expect(newAppCommand(null)).toEqual({ do: '', undo: '' });
  });

  it('reads list fields, defaulting to an empty list', () => {
    const app = { uuid: 'u', name: 'n', detached: ['a'], 'prep-cmd': 'broken' };
    expect(listField<string>(app, 'detached')).toEqual(['a']);
    expect(listField(app, 'prep-cmd')).toEqual([]);
    expect(listField(app, 'state-cmd')).toEqual([]);
  });
});

describe('scale factor', () => {
  it('parses the stored value and falls back to 100', () => {
    expect(scaleFactorValue(120)).toBe(120);
    expect(scaleFactorValue('150')).toBe(150);
    expect(scaleFactorValue(undefined)).toBe(100);
    expect(scaleFactorValue('x')).toBe(100);
  });
});

describe('save payload', () => {
  it('keeps the new-app template verbatim and drops the empty uuid', () => {
    expect(NEW_APP_TEMPLATE).toEqual({
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
    });
    expect(buildSavePayload(newAppDraft())).toEqual(NEW_APP_TEMPLATE);
  });

  it('normalises like the legacy save()', () => {
    const app = editDraft({
      uuid: 'u-1',
      name: '  Game  ',
      'exit-timeout': '12',
      'scale-factor': '150',
      'image-path': '  "C:\\covers\\game.png"  ',
      id: 3,
      launching: false,
      dragover: true,
      'working-dir': 'C:\\games',
    });
    expect(buildSavePayload(app)).toEqual({
      ...NEW_APP_TEMPLATE,
      uuid: 'u-1',
      name: 'Game',
      'exit-timeout': 12,
      'scale-factor': 150,
      'image-path': 'C:\\covers\\game.png',
      'working-dir': 'C:\\games',
    });
  });

  it('falls back to 5 and 100 for blank, zero or invalid numbers (parseInt || default)', () => {
    const payload = buildSavePayload({ uuid: 'u', name: 'A', 'exit-timeout': '', 'scale-factor': 0 });
    expect(payload?.['exit-timeout']).toBe(5);
    expect(payload?.['scale-factor']).toBe(100);
    expect(buildSavePayload({ uuid: 'u', name: 'A', 'exit-timeout': 0 })?.['exit-timeout']).toBe(5);
    expect(buildSavePayload({ uuid: 'u', name: 'A', 'exit-timeout': 7.9 })?.['exit-timeout']).toBe(7);
    expect(buildSavePayload({ uuid: 'u', name: 'A' })?.['image-path']).toBe('');
  });

  it('refuses a blank name', () => {
    expect(savableName({ uuid: '', name: '   ' })).toBeNull();
    expect(buildSavePayload({ uuid: '', name: '   ' })).toBeNull();
    expect(savableName({ uuid: '', name: ' x ' })).toBe('x');
  });
});

describe('environment variables reference', () => {
  it('lists the legacy rows in order', () => {
    expect(APP_ENV_VARS).toHaveLength(14);
    expect(APP_ENV_VARS[0]).toEqual({ name: 'HELIOS_APP_ID', descKey: 'apps.env_app_id' });
    expect(APP_ENV_VARS[13]).toEqual({
      name: 'HELIOS_CLIENT_AUDIO_CONFIGURATION',
      descKey: 'apps.env_client_audio_config',
    });
  });

  it('picks the example of the platform', () => {
    expect(envExample('windows')?.labelKey).toBe('apps.env_rtss_cli_example');
    expect(envExample('windows')?.command).toBe('cmd /C \\path\\to\\rtss-cli.exe limit:set %HELIOS_CLIENT_FPS%');
    expect(envExample('linux')?.labelKey).toBe('apps.env_xrandr_example');
    expect(envExample('linux')?.command).toContain('xrandr --output HDMI-1');
    expect(envExample('macos')?.labelKey).toBe('apps.env_displayplacer_example');
    expect(envExample('macos')?.command).toContain('displayplacer "id:<screenId>');
    expect(envExample(null)).toBeNull();
  });

  it('links to the app examples of this repository', () => {
    expect(APP_EXAMPLES_URL).toBe('https://github.com/eumarcodev/Helios-Server/blob/master/docs/app_examples.md');
  });
});
