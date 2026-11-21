// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { resolveBuildPaths } from './build-paths.js';
import { heliosPageRoutes, PAGE_NAMES, pageRoutesMiddleware, rewritePageUrl } from './helios-page-routes';

describe('rewritePageUrl', () => {
  it.each([
    ['/', '/index.html'],
    ['/pin', '/pin.html'],
    ['/apps', '/apps.html'],
    ['/config', '/config.html'],
    ['/password', '/password.html'],
    ['/welcome', '/welcome.html'],
    ['/login', '/login.html'],
    ['/troubleshooting', '/troubleshooting.html'],
  ])('maps %s to %s', (url, expected) => {
    expect(rewritePageUrl(url)).toBe(expected);
  });

  it('accepts a trailing slash and keeps query and hash', () => {
    expect(rewritePageUrl('/config/')).toBe('/config.html');
    expect(rewritePageUrl('/login?redir=./config#general')).toBe('/login.html?redir=./config#general');
    expect(rewritePageUrl('/troubleshooting#logs')).toBe('/troubleshooting.html#logs');
  });

  it('leaves other URLs alone', () => {
    expect(rewritePageUrl('/api/config')).toBeNull();
    expect(rewritePageUrl('/assets/app.js')).toBeNull();
    expect(rewritePageUrl('/config.html')).toBeNull();
    expect(rewritePageUrl('/configx')).toBeNull();
  });

  it('covers the 8 pages', () => {
    expect(PAGE_NAMES).toHaveLength(8);
  });
});

describe('pageRoutesMiddleware', () => {
  it('rewrites req.url and calls next', () => {
    const req = { url: '/apps?x=1' } as Parameters<typeof pageRoutesMiddleware>[0];
    const next = vi.fn();
    pageRoutesMiddleware(req, {} as Parameters<typeof pageRoutesMiddleware>[1], next);
    expect(req.url).toBe('/apps.html?x=1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('keeps unknown URLs and requests without url', () => {
    const req = { url: '/api/apps' } as Parameters<typeof pageRoutesMiddleware>[0];
    const empty = {} as Parameters<typeof pageRoutesMiddleware>[0];
    const next = vi.fn();
    pageRoutesMiddleware(req, {} as Parameters<typeof pageRoutesMiddleware>[1], next);
    pageRoutesMiddleware(empty, {} as Parameters<typeof pageRoutesMiddleware>[1], next);
    expect(req.url).toBe('/api/apps');
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe('heliosPageRoutes plugin', () => {
  it('installs the middleware on the dev and preview servers', () => {
    const plugin = heliosPageRoutes();
    const use = vi.fn();
    const server = { middlewares: { use } };
    (plugin.configureServer as (s: unknown) => void)(server);
    (plugin.configurePreviewServer as (s: unknown) => void)(server);
    expect(plugin.name).toBe('helios-page-routes');
    expect(use).toHaveBeenCalledTimes(2);
    expect(use).toHaveBeenCalledWith(pageRoutesMiddleware);
  });
});

describe('resolveBuildPaths', () => {
  const realpath = (path: string) => path;
  const appDir = '/repo/src_assets/common/assets/web-react';

  it('builds into dist by default', () => {
    expect(resolveBuildPaths({}, appDir, realpath)).toEqual({
      root: appDir,
      outDir: expect.stringMatching(/web-react[\\/]dist$/),
    });
  });

  it('uses the CMake asset directories', () => {
    const paths = resolveBuildPaths(
      { HELIOS_SOURCE_ASSETS_DIR: '/repo/src_assets', HELIOS_ASSETS_DIR: '/repo/build' },
      appDir,
      realpath,
    );
    expect(paths.root).toMatch(/src_assets[\\/]common[\\/]assets[\\/]web-react$/);
    expect(paths.outDir).toMatch(/build[\\/]assets[\\/]web$/);
  });

  it('ignores the directories for Homebrew builds', () => {
    const paths = resolveBuildPaths(
      { HELIOS_BUILD_HOMEBREW: 'true', HELIOS_ASSETS_DIR: '/repo/build' },
      appDir,
      realpath,
    );
    expect(paths.outDir).toMatch(/dist$/);
  });
});
