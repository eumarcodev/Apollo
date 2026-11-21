import { describe, expect, it } from 'vitest';
import { applyTheme, getPreferredTheme, type ThemeEnvironment } from '../src/shared/ui/theme';
import { THEME_BOOTSTRAP_SCRIPT, themeBootstrap } from './theme-bootstrap';

interface Scenario {
  stored: string | null | 'throws';
  systemDark: boolean;
}

function createEnvironment({ stored, systemDark }: Scenario) {
  const root = document.createElement('html');
  const storage = {
    getItem: (): string | null => {
      if (stored === 'throws') {
        throw new Error('storage blocked');
      }
      return stored;
    },
    setItem: () => undefined,
  };
  const matchMedia = () => ({ matches: systemDark }) as MediaQueryList;
  return { root, storage, matchMedia };
}

function runScript(scenario: Scenario) {
  const { root, storage, matchMedia } = createEnvironment(scenario);
  const fakeWindow = { localStorage: storage, matchMedia };
  new Function('window', 'document', THEME_BOOTSTRAP_SCRIPT)(fakeWindow, { documentElement: root });
  return root;
}

function runThemeModule(scenario: Scenario) {
  const { root, storage, matchMedia } = createEnvironment(scenario);
  const env: ThemeEnvironment = { storage, matchMedia, root };
  applyTheme(getPreferredTheme(env), env);
  return root;
}

const scenarios: Scenario[] = [];
for (const stored of ['light', 'dark', 'auto', null, 'garbage', 'throws'] as const) {
  for (const systemDark of [false, true]) {
    scenarios.push({ stored, systemDark });
  }
}

describe('theme bootstrap script', () => {
  it.each(scenarios)('matches shared/ui/theme for %o', (scenario) => {
    const fromScript = runScript(scenario);
    const fromModule = runThemeModule(scenario);
    expect(fromScript.className).toBe(fromModule.className);
    expect(fromScript.getAttribute('data-theme')).toBe(fromModule.getAttribute('data-theme'));
  });

  it('never throws when the browser APIs are missing', () => {
    expect(() => new Function('window', 'document', THEME_BOOTSTRAP_SCRIPT)({}, { documentElement: {} })).not.toThrow();
  });

  it('injects the script first in <head>', () => {
    const plugin = themeBootstrap();
    const hook = plugin.transformIndexHtml as { order: string; handler: () => unknown };
    expect(hook.order).toBe('pre');
    expect(hook.handler()).toEqual([{ tag: 'script', children: THEME_BOOTSTRAP_SCRIPT, injectTo: 'head-prepend' }]);
  });
});
