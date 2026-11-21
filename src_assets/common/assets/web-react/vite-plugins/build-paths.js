// Shared by vite.config.ts and scripts/check-dist.mjs so both agree on where the build goes.
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolve the Vite root and output directory from the CMake environment.
 * Same semantics as the legacy build: HELIOS_BUILD_HOMEBREW ignores the paths, and symlinks are resolved
 * first (Rollup rejects asset names that traverse a symlinked path).
 * @param {Record<string, string | undefined>} env
 * @param {string} appDir absolute path of the web-react folder
 * @param {(path: string) => string} [realpath]
 * @returns {{ root: string, outDir: string }}
 */
export function resolveBuildPaths(env, appDir, realpath = realpathSync) {
  let root = appDir;
  let outDir = resolve(appDir, 'dist');
  if (env.HELIOS_BUILD_HOMEBREW) {
    return { root, outDir };
  }
  if (env.HELIOS_SOURCE_ASSETS_DIR) {
    root = resolve(realpath(env.HELIOS_SOURCE_ASSETS_DIR), 'common/assets/web-react');
  }
  if (env.HELIOS_ASSETS_DIR) {
    outDir = resolve(realpath(env.HELIOS_ASSETS_DIR), 'assets/web');
  }
  return { root, outDir };
}
