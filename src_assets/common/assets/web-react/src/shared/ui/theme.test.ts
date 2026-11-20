import { describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  getPreferredTheme,
  getStoredTheme,
  initTheme,
  resolveTheme,
  setStoredTheme,
  type ThemeEnvironment,
} from './theme';

function environment(stored: string | null, systemDark: boolean) {
  const values = new Map<string, string>(stored === null ? [] : [['theme', stored]]);
  const listeners: Array<() => void> = [];
  const media = {
    matches: systemDark,
    addEventListener: vi.fn((_event: string, listener: () => void) => listeners.push(listener)),
    removeEventListener: vi.fn(),
  };
  const root = document.createElement('html');
  const env: ThemeEnvironment = {
    storage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => void values.set(key, value) },
    matchMedia: () => media as unknown as MediaQueryList,
    root,
  };
  return { env, root, media, listeners, values };
}

describe('theme', () => {
  it('reads the legacy storage key and ignores invalid values', () => {
    expect(getStoredTheme(environment('dark', false).env)).toBe('dark');
    expect(getStoredTheme(environment('blue', false).env)).toBeNull();
    const broken = environment(null, false).env;
    broken.storage.getItem = () => {
      throw new Error('blocked');
    };
    expect(getStoredTheme(broken)).toBeNull();
  });

  it('prefers the stored theme, then the system theme', () => {
    expect(getPreferredTheme(environment('light', true).env)).toBe('light');
    expect(getPreferredTheme(environment(null, true).env)).toBe('dark');
    expect(resolveTheme('auto', environment(null, false).env)).toBe('light');
  });

  it('applies class and data-theme for HeroUI', () => {
    const { env, root } = environment(null, false);
    expect(applyTheme('dark', env)).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('light', env);
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.classList.contains('light')).toBe(true);
  });

  it('stores the choice and survives blocked storage', () => {
    const { env, values } = environment(null, false);
    setStoredTheme('auto', env);
    expect(values.get('theme')).toBe('auto');
    env.storage.setItem = () => {
      throw new Error('blocked');
    };
    expect(() => setStoredTheme('dark', env)).not.toThrow();
  });

  it('follows the system theme unless light/dark was chosen', () => {
    const auto = environment('auto', true);
    const stop = initTheme(auto.env);
    expect(auto.root.getAttribute('data-theme')).toBe('dark');
    auto.media.matches = false;
    auto.values.delete('theme');
    auto.listeners.forEach((listener) => listener());
    expect(auto.root.getAttribute('data-theme')).toBe('light');
    stop();
    expect(auto.media.removeEventListener).toHaveBeenCalled();

    const fixed = environment('dark', true);
    initTheme(fixed.env);
    fixed.media.matches = false;
    fixed.listeners.forEach((listener) => listener());
    expect(fixed.root.getAttribute('data-theme')).toBe('dark');
  });

  it('uses the browser environment by default', () => {
    window.localStorage.setItem('theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
    setStoredTheme('light');
    expect(getPreferredTheme()).toBe('light');
    expect(resolveTheme('auto')).toBe('light');
    expect(applyTheme('dark')).toBe('dark');
    initTheme()();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    window.localStorage.removeItem('theme');
  });
});
