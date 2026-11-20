import type { Plugin } from 'vite';

/**
 * Blocking script that applies the theme before the first paint (no flash of the wrong theme). It mirrors
 * `src/shared/ui/theme.ts` (stored `light` | `dark` | `auto` under `localStorage.theme`, dark when nothing
 * valid is stored, system theme for `auto`, `class` + `data-theme` on `<html>`); `theme-bootstrap.test.ts` checks both agree.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function () {
  try {
    var stored = null;
    try {
      stored = window.localStorage.getItem('theme');
    } catch (e) {}
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : stored === 'auto' ? (dark ? 'dark' : 'light') : 'dark';
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  } catch (e) {}
})();`;

/** Vite plugin: injects the theme script as the first element of `<head>` of every page. */
export function themeBootstrap(): Plugin {
  return {
    name: 'helios-theme-bootstrap',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [{ tag: 'script', children: THEME_BOOTSTRAP_SCRIPT, injectTo: 'head-prepend' }];
      },
    },
  };
}
