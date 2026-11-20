/**
 * Light/dark theme, same storage as the legacy theme.js (`localStorage.theme` = `light` | `dark` | `auto`),
 * applied the way HeroUI v3 expects it: `class` and `data-theme` on `<html>`.
 */
export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export interface ThemeEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  matchMedia: (query: string) => MediaQueryList;
  root: HTMLElement;
}

function defaultEnvironment(): ThemeEnvironment {
  return { storage: window.localStorage, matchMedia: (q) => window.matchMedia(q), root: document.documentElement };
}

export function getStoredTheme(env: ThemeEnvironment = defaultEnvironment()): ThemePreference | null {
  try {
    const value = env.storage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'auto' ? value : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: ThemePreference, env: ThemeEnvironment = defaultEnvironment()): void {
  try {
    env.storage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage blocked: the choice only lasts for this page
  }
}

function systemTheme(env: ThemeEnvironment): ResolvedTheme {
  return env.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Stored preference, or the system theme when nothing is stored (legacy getPreferredTheme). */
export function getPreferredTheme(env: ThemeEnvironment = defaultEnvironment()): ThemePreference {
  return getStoredTheme(env) ?? systemTheme(env);
}

export function resolveTheme(theme: ThemePreference, env: ThemeEnvironment = defaultEnvironment()): ResolvedTheme {
  return theme === 'auto' ? systemTheme(env) : theme;
}

export function applyTheme(theme: ThemePreference, env: ThemeEnvironment = defaultEnvironment()): ResolvedTheme {
  const resolved = resolveTheme(theme, env);
  env.root.classList.remove('light', 'dark');
  env.root.classList.add(resolved);
  env.root.setAttribute('data-theme', resolved);
  return resolved;
}

/**
 * Apply the preferred theme and follow system changes while the stored preference is not an explicit
 * light/dark (legacy loadAutoTheme). Returns a function that stops listening.
 */
export function initTheme(env: ThemeEnvironment = defaultEnvironment()): () => void {
  applyTheme(getPreferredTheme(env), env);
  const media = env.matchMedia(DARK_QUERY);
  const onChange = () => {
    const stored = getStoredTheme(env);
    if (stored !== 'light' && stored !== 'dark') {
      applyTheme(getPreferredTheme(env), env);
    }
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
