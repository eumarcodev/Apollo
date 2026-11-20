import { describe, expect, it } from 'vitest';
import { parseLoadedConfig } from './config-model';
import { CONFIG_TABS, visibleTabs } from './config-tabs';
import {
  createPrepCommand,
  createServerCommand,
  LOG_LEVEL_CHOICES,
  localeChoices,
  SERVER_COMMANDS_DOCS_URL,
  UPDATE_CHANNEL_CHOICES,
} from './general-options';

describe('localeChoices', () => {
  it('offers only English and Portuguese (Brazil)', () => {
    expect(localeChoices('en').map((choice) => choice.value)).toEqual(['en', 'pt_BR']);
    expect(localeChoices('pt_BR').map((choice) => choice.value)).toEqual(['en', 'pt_BR']);
  });

  it('does not add anything for an empty or missing value', () => {
    expect(localeChoices('')).toHaveLength(2);
    expect(localeChoices(undefined)).toHaveLength(2);
  });

  it('keeps another locale as an extra option with its raw code', () => {
    const choices = localeChoices('de');
    expect(choices).toHaveLength(3);
    expect(choices[2]).toEqual({ value: 'de', label: 'de', raw: true });
  });
});

describe('select choices', () => {
  it('lists the log levels 0..6 as strings', () => {
    expect(LOG_LEVEL_CHOICES.map((choice) => choice.value)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(LOG_LEVEL_CHOICES[4]?.label).toBe('config.min_log_level_4');
  });

  it('lists the update channels, automatic first (empty value)', () => {
    expect(UPDATE_CHANNEL_CHOICES.map((choice) => [choice.value, choice.label])).toEqual([
      ['', 'config.update_channel_auto'],
      ['stable', 'config.update_channel_stable'],
      ['rc', 'config.update_channel_rc'],
      ['nightly', 'config.update_channel_nightly'],
    ]);
  });
});

describe('new command rows', () => {
  it('adds elevated: false only on Windows', () => {
    expect(createPrepCommand('windows')).toEqual({ do: '', undo: '', elevated: false });
    expect(createPrepCommand('linux')).toEqual({ do: '', undo: '' });
    expect(createServerCommand('windows')).toEqual({ name: '', cmd: '', elevated: false });
    expect(createServerCommand('macos')).toEqual({ name: '', cmd: '' });
  });

  it('returns a fresh object each time', () => {
    expect(createPrepCommand('linux')).not.toBe(createPrepCommand('linux'));
  });
});

describe('General defaults', () => {
  const general = CONFIG_TABS.find((tab) => tab.id === 'general');

  it('keeps the legacy defaults verbatim', () => {
    expect(general?.options).toEqual({
      locale: 'en',
      sunshine_name: '',
      min_log_level: 2,
      global_prep_cmd: [],
      global_state_cmd: [],
      server_cmd: [],
      notify_pre_releases: 'disabled',
      update_channel: '',
      system_tray: 'enabled',
      hide_tray_controls: 'disabled',
      enable_pairing: 'enabled',
      enable_discovery: 'enabled',
    });
  });

  it('fills enable_pairing with "enabled" when the server does not send it (legacy onMounted)', () => {
    const { config } = parseLoadedConfig({ status: true, platform: 'linux' }, 'linux', visibleTabs('linux'));
    expect(config['enable_pairing']).toBe('enabled');
    expect(config['enable_discovery']).toBe('enabled');
  });

  it('keeps an explicit enable_pairing from the server', () => {
    const { config } = parseLoadedConfig({ enable_pairing: 'disabled' }, 'linux', visibleTabs('linux'));
    expect(config['enable_pairing']).toBe('disabled');
  });
});

describe('server commands docs link', () => {
  it('points to the Helios docs', () => {
    expect(SERVER_COMMANDS_DOCS_URL).toBe('https://github.com/eumarcodev/Helios-Server/tree/master/docs');
  });
});
