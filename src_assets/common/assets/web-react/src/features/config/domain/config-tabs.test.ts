import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG_TAB_IDS, CONFIG_TABS, resolveHash, visibleTabs } from './config-tabs';

const LEGACY_PAGE = resolve(__dirname, '../../../../../web/config.html');

/** The `tabs` array of the legacy page, evaluated from its source (ids, names and default options). */
function readLegacyTabs(): Array<{ id: string; name: string; options: Record<string, unknown> }> {
  const source = readFileSync(LEGACY_PAGE, 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('tabs: [');
  const end = source.indexOf('\n        ],\n', start);
  const literal = source.substring(start + 'tabs: '.length, end + '\n        ]'.length);
  return new Function(`return ${literal};`)() as Array<{ id: string; name: string; options: Record<string, unknown> }>;
}

const LEGACY_NAMES: Record<string, string> = {
  general: 'General',
  input: 'Input',
  av: 'Audio/Video',
  network: 'Network',
  files: 'Config Files',
  advanced: 'Advanced',
  nv: 'NVIDIA NVENC Encoder',
  qsv: 'Intel QuickSync Encoder',
  amd: 'AMD AMF Encoder',
  pyrowave: 'PyroWave Encoder (experimental)',
  vt: 'VideoToolbox Encoder',
  vaapi: 'VA-API Encoder',
  sw: 'Software Encoder',
};

describe('tab registry', () => {
  it('keeps the legacy ids and order', () => {
    expect(CONFIG_TABS.map((tab) => tab.id)).toEqual([...CONFIG_TAB_IDS]);
    expect(CONFIG_TAB_IDS).toEqual(Object.keys(LEGACY_NAMES));
    for (const tab of CONFIG_TABS) {
      expect(tab.nameKey).toBe(`config.tab_${tab.id}`);
    }
  });

  it('matches the defaults table snapshot', () => {
    const table = Object.fromEntries(CONFIG_TABS.map((tab) => [tab.id, tab.options]));
    expect(table).toMatchSnapshot();
  });

  it('keeps the option order of each tab', () => {
    expect(Object.keys(CONFIG_TABS[0]!.options)).toEqual([
      'locale',
      'sunshine_name',
      'min_log_level',
      'global_prep_cmd',
      'global_state_cmd',
      'server_cmd',
      'notify_pre_releases',
      'update_channel',
      'system_tray',
      'hide_tray_controls',
      'enable_pairing',
      'enable_discovery',
    ]);
  });

  it('owns every option in exactly one tab', () => {
    const keys = CONFIG_TABS.flatMap((tab) => Object.keys(tab.options));
    expect(new Set(keys).size).toBe(keys.length);
  });

  // The legacy page is the reference until the cut-over of epic #156 removes it.
  it.skipIf(!existsSync(LEGACY_PAGE))('is identical to the tabs of the legacy config.html', () => {
    const legacy = readLegacyTabs();
    expect(legacy.map((tab) => tab.id)).toEqual([...CONFIG_TAB_IDS]);
    for (const [index, tab] of legacy.entries()) {
      const ported = CONFIG_TABS[index]!;
      expect(tab.name).toBe(LEGACY_NAMES[tab.id]);
      expect(JSON.stringify(ported.options)).toBe(JSON.stringify(tab.options));
    }
  });
});

describe('visibleTabs', () => {
  const ids = (platform: 'windows' | 'linux' | 'macos') => visibleTabs(platform).map((tab) => tab.id);

  it('hides vt and vaapi on Windows', () => {
    expect(ids('windows')).toEqual([
      'general',
      'input',
      'av',
      'network',
      'files',
      'advanced',
      'nv',
      'qsv',
      'amd',
      'pyrowave',
      'sw',
    ]);
  });

  it('hides amd, qsv, vt and pyrowave on Linux', () => {
    expect(ids('linux')).toEqual(['general', 'input', 'av', 'network', 'files', 'advanced', 'nv', 'vaapi', 'sw']);
  });

  it('hides amd, nv, qsv, vaapi and pyrowave on macOS', () => {
    expect(ids('macos')).toEqual(['general', 'input', 'av', 'network', 'files', 'advanced', 'vt', 'sw']);
  });
});

describe('resolveHash', () => {
  const tabs = visibleTabs('windows');

  it('selects a tab by id', () => {
    expect(resolveHash('#network', tabs)).toEqual({ tabId: 'network', optionKey: null });
  });

  it('selects the tab that owns an option and scrolls to it', () => {
    expect(resolveHash('#qp', tabs)).toEqual({ tabId: 'advanced', optionKey: 'qp' });
    expect(resolveHash('fallback_mode', tabs)).toEqual({ tabId: 'av', optionKey: 'fallback_mode' });
  });

  it('prefers the option when a tab id is also an option key (last match wins)', () => {
    expect(resolveHash('#pyrowave', tabs)).toEqual({ tabId: 'pyrowave', optionKey: 'pyrowave' });
  });

  it('ignores empty, unknown and hidden targets', () => {
    expect(resolveHash('', tabs)).toBeNull();
    expect(resolveHash('#', tabs)).toBeNull();
    expect(resolveHash('#nope', tabs)).toBeNull();
    expect(resolveHash('#vt', tabs)).toBeNull();
    expect(resolveHash('#vt_coder', tabs)).toBeNull();
    expect(resolveHash('#toString', tabs)).toBeNull();
  });
});
