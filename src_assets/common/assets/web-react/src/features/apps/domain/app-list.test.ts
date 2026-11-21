import { describe, expect, it } from 'vitest';
import { alphabetize, isLocalHostname, moveApps, parseAppsListing, reorderPayload, sameOrder } from './app-list';

const app = (uuid: string, name: string) => ({ uuid, name });
const LIST = [app('1', 'Cyberpunk'), app('2', 'Alpha'), app('3', 'Zelda-like'), app('4', 'Beta')];

describe('parseAppsListing', () => {
  it('keeps only the apps with a uuid and reads the host fields', () => {
    const listing = parseAppsListing({
      apps: [{ uuid: 'a', name: 'A', cmd: 'x' }, { name: 'no uuid' }, { uuid: '', name: 'empty' }, null, 'junk'],
      current_app: 'a',
      host_name: 'PC',
      host_uuid: 'h1',
    });
    expect(listing).toEqual({
      apps: [{ uuid: 'a', name: 'A', cmd: 'x' }],
      currentApp: 'a',
      hostName: 'PC',
      hostUuid: 'h1',
    });
  });

  it('survives a body without apps', () => {
    expect(parseAppsListing(undefined)).toEqual({ apps: [], currentApp: '', hostName: '', hostUuid: '' });
    expect(parseAppsListing({ apps: 'x', current_app: 3 }).apps).toEqual([]);
  });

  it('turns a missing name into an empty one', () => {
    expect(parseAppsListing({ apps: [{ uuid: 'a' }] }).apps[0]).toMatchObject({ uuid: 'a', name: '' });
  });
});

describe('alphabetize', () => {
  it('sorts by name with localeCompare and reports the change', () => {
    const result = alphabetize(LIST);
    expect(result.apps.map((a) => a.name)).toEqual(['Alpha', 'Beta', 'Cyberpunk', 'Zelda-like']);
    expect(result.changed).toBe(true);
    expect(LIST[0]?.name).toBe('Cyberpunk');
  });

  it('reports no change when the list is already ordered', () => {
    expect(alphabetize([app('1', 'A'), app('2', 'B')]).changed).toBe(false);
    expect(alphabetize([]).changed).toBe(false);
  });

  it('keeps equal names in place (stable)', () => {
    expect(alphabetize([app('1', 'A'), app('2', 'A')]).changed).toBe(false);
  });
});

describe('moveApps', () => {
  it('moves an app before and after the target', () => {
    expect(moveApps(LIST, new Set(['4']), '1', 'before').map((a) => a.uuid)).toEqual(['4', '1', '2', '3']);
    expect(moveApps(LIST, new Set(['1']), '3', 'after').map((a) => a.uuid)).toEqual(['2', '3', '1', '4']);
  });

  it('moves several apps keeping their relative order', () => {
    expect(moveApps(LIST, new Set(['3', '1']), '4', 'after').map((a) => a.uuid)).toEqual(['2', '4', '1', '3']);
  });

  it('returns the same array when nothing moves', () => {
    expect(moveApps(LIST, new Set(['1']), '1', 'before')).toBe(LIST);
    expect(moveApps(LIST, new Set(['1']), '2', 'before')).toBe(LIST);
    expect(moveApps(LIST, new Set(['2']), '1', 'after')).toBe(LIST);
    expect(moveApps(LIST, new Set(['1']), 'missing', 'after')).toBe(LIST);
    expect(moveApps(LIST, new Set(['missing']), '1', 'after')).toBe(LIST);
  });
});

describe('reorderPayload and sameOrder', () => {
  it('lists the uuids in the shown order', () => {
    expect(reorderPayload(LIST)).toEqual({ order: ['1', '2', '3', '4'] });
  });

  it('compares the order by uuid', () => {
    expect(sameOrder(LIST, [...LIST])).toBe(true);
    expect(sameOrder(LIST, [...LIST].reverse())).toBe(false);
    expect(sameOrder(LIST, LIST.slice(1))).toBe(false);
  });
});

describe('isLocalHostname', () => {
  it('accepts the three loopback names of the legacy page only', () => {
    for (const name of ['localhost', '127.0.0.1', '[::1]']) {
      expect(isLocalHostname(name)).toBe(true);
    }
    for (const name of ['192.168.0.10', 'helios.lan', '::1', '127.0.0.2']) {
      expect(isLocalHostname(name)).toBe(false);
    }
  });
});
