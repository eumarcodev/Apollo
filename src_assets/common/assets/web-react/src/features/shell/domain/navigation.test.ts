import { describe, expect, it } from 'vitest';
import { findActiveNavItem, NAV_ITEMS } from './navigation';
import { THEME_OPTIONS } from './theme-options';

describe('navigation', () => {
  it('lists the six pages in the legacy order with relative links', () => {
    expect(NAV_ITEMS.map((item) => [item.href, item.labelKey])).toEqual([
      ['./', 'navbar.home'],
      ['./pin', 'navbar.pin'],
      ['./apps', 'navbar.applications'],
      ['./config', 'navbar.configuration'],
      ['./password', 'navbar.password'],
      ['./troubleshooting', 'navbar.troubleshoot'],
    ]);
  });

  it.each([
    ['/', 'home'],
    ['/index.html', 'home'],
    ['', 'home'],
    ['/pin', 'pin'],
    ['/config.html', 'configuration'],
    ['/apps/', 'applications'],
    ['/config', 'configuration'],
    ['/password', 'password'],
    ['/troubleshooting', 'troubleshooting'],
    ['/welcome', null],
    ['/login', null],
    ['/unknown', null],
  ])('finds the active item for %s', (pathname, expected) => {
    expect(findActiveNavItem(pathname)).toBe(expected);
  });

  it('offers light, dark and auto with the legacy label keys', () => {
    expect(THEME_OPTIONS.map((option) => [option.value, option.labelKey])).toEqual([
      ['light', 'navbar.theme_light'],
      ['dark', 'navbar.theme_dark'],
      ['auto', 'navbar.theme_auto'],
    ]);
  });
});
