import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppsBrowser } from './browser';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createAppsBrowser', () => {
  it('reports the hostname of the page', () => {
    expect(createAppsBrowser().hostname).toBe(window.location.hostname);
  });

  it('opens a link through an anchor click', () => {
    const seen: Array<[string | null, boolean]> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      seen.push([this.getAttribute('href'), this.hasAttribute('download')]);
    });
    createAppsBrowser().openLink('art://launch?x=1');
    expect(seen).toEqual([['art://launch?x=1', false]]);
  });

  it('downloads a file with its name', () => {
    const seen: Array<[string | null, string | null]> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      seen.push([this.getAttribute('href'), this.getAttribute('download')]);
    });
    createAppsBrowser().download({ fileName: 'Game.art', href: 'data:text/plain;charset=utf-8,x' });
    expect(seen).toEqual([['data:text/plain;charset=utf-8,x', 'Game.art']]);
  });
});
