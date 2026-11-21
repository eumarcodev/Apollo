import { describe, expect, it } from 'vitest';
import {
  HeliosVersion,
  normalizeUpdateChannel,
  parseVersion,
  pickLatestRelease,
  resolveUpdateChannel,
  type GithubRelease,
} from './helios-version';

// Port of the legacy web UI version tests, plus the edges of the TypeScript port.
const v = (version: string) => new HeliosVersion(version);
const release = (tag: string, extra: Partial<GithubRelease> = {}): GithubRelease => ({
  tag_name: tag,
  name: `Helios ${tag}`,
  ...extra,
});

describe('HeliosVersion', () => {
  it('parses stable, rc, nightly and beta versions', () => {
    expect([v('v1.3.0').channel, v('v1.3.0').channelNumber]).toEqual(['stable', 0]);
    expect([v('1.3.0-rc.2').channel, v('1.3.0-rc.2').channelNumber]).toEqual(['rc', 2]);
    expect([v('1.3.0-nightly.20261116').channel, v('1.3.0-nightly.20261116').channelNumber]).toEqual([
      'nightly',
      20261116,
    ]);
    expect([v('1.3.0-beta.5').channel, v('1.3.0-beta.5').channelNumber]).toEqual(['beta', 5]);
    expect(v('1.3.0-alpha.1').channel).toBe('beta');
    expect(v('v12.34.56').parts).toEqual([12, 34, 56]);
  });

  it('treats a pre-release label without a number as number 0 and accepts an upper-case V', () => {
    expect([v('V1.3.0-rc').channel, v('V1.3.0-rc').channelNumber]).toEqual(['rc', 0]);
  });

  it('counts local dirty builds as stable builds of their own number', () => {
    const dirty = v('0.0.0.395aa4ef.dirty');
    expect(dirty.channel).toBe('stable');
    expect(dirty.parts).toEqual([0, 0, 0]);
    expect(v('1.0.0').isGreater(dirty)).toBe(true);
  });

  it('never orders unparsable versions', () => {
    expect(v('latest').compare('1.0.0')).toBe(0);
    expect(v('1.0.0').compare('latest')).toBe(0);
    expect(v('latest').isGreater('1.0.0')).toBe(false);
    expect(v('latest').parts).toBeNull();
    expect(v('latest').channel).toBeNull();
  });

  it('orders by X.Y.Z, then channel, then number', () => {
    const order = [
      '1.2.9',
      '1.3.0-nightly.20261115',
      '1.3.0-nightly.20261116',
      '1.3.0-beta.1',
      '1.3.0-rc.1',
      '1.3.0-rc.2',
      '1.3.0',
      '1.3.1-nightly.20261201',
      '1.3.1',
      '1.10.0',
    ];
    order.forEach((left, i) => {
      order.forEach((right, j) => {
        expect(v(left).compare(right), `${left} vs ${right}`).toBe(Math.sign(i - j));
      });
    });
  });

  it('offers the stable of the same version to an installed rc', () => {
    expect(v('1.3.0').isGreater('1.3.0-rc.4')).toBe(true);
    expect(v('1.3.0-rc.4').isGreater('1.3.0')).toBe(false);
  });

  it('compares with another HeliosVersion object as well as with a string', () => {
    expect(v('1.4.0').compare(v('1.3.0'))).toBe(1);
  });

  it('requires a version and keeps the release it came from', () => {
    expect(() => new HeliosVersion('')).toThrow('A version is required');
    const source = release('v1.2.0');
    const fromRelease = HeliosVersion.fromRelease(source);
    expect(fromRelease.version).toBe('v1.2.0');
    expect(fromRelease.release).toBe(source);
    expect(v('1.2.0').release).toBeNull();
  });
});

describe('parseVersion', () => {
  it('rejects anything that is not a version string', () => {
    expect(parseVersion(undefined)).toBeNull();
    expect(parseVersion(12)).toBeNull();
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
  });
});

describe('normalizeUpdateChannel', () => {
  it('only accepts known channels', () => {
    expect(normalizeUpdateChannel('rc')).toBe('rc');
    expect(normalizeUpdateChannel(' Nightly ')).toBe('nightly');
    expect(normalizeUpdateChannel('')).toBeNull();
    expect(normalizeUpdateChannel('beta')).toBeNull();
    expect(normalizeUpdateChannel(undefined)).toBeNull();
  });
});

describe('resolveUpdateChannel', () => {
  it('follows the setting, the legacy option, then the installed channel', () => {
    expect(resolveUpdateChannel('nightly', 'disabled', v('1.0.0'))).toBe('nightly');
    expect(resolveUpdateChannel('', 'enabled', v('1.0.0'))).toBe('rc');
    expect(resolveUpdateChannel(undefined, 'disabled', v('1.0.0'))).toBe('stable');
    expect(resolveUpdateChannel('', 'disabled', v('1.3.0-nightly.20261116'))).toBe('nightly');
    expect(resolveUpdateChannel('', 'disabled', v('1.3.0-rc.1'))).toBe('rc');
    expect(resolveUpdateChannel('', 'disabled', v('1.3.0-beta.1'))).toBe('rc');
    expect(resolveUpdateChannel('stable', 'enabled', v('1.3.0-nightly.1'))).toBe('stable');
  });

  it.each(['enabled', 'true', 'on', 'yes', '1', 'TRUE'])('reads %s as the legacy flag turned on', (flag) => {
    expect(resolveUpdateChannel('', flag, null)).toBe('rc');
  });

  it('falls back to stable without an installed version', () => {
    expect(resolveUpdateChannel('', 'disabled', null)).toBe('stable');
  });
});

describe('pickLatestRelease', () => {
  it('respects the update channel', () => {
    // develop's nightlies use a base above the release in progress (1.3.0-rc.* -> 1.4.0-nightly.*)
    const releases = [
      release('v1.4.0-nightly.20261117', { prerelease: true }),
      release('v1.3.0-rc.2', { prerelease: true }),
      release('v1.3.0-rc.1', { prerelease: true }),
      release('v1.2.1'),
      release('v1.2.0'),
      release('v9.9.9', { draft: true }),
      release('not-a-version'),
    ];
    expect(pickLatestRelease(releases, 'stable')?.version).toBe('v1.2.1');
    expect(pickLatestRelease(releases, 'rc')?.version).toBe('v1.3.0-rc.2');
    expect(pickLatestRelease(releases, 'nightly')?.version).toBe('v1.4.0-nightly.20261117');
    expect(pickLatestRelease(releases, 'unknown')?.version).toBe('v1.2.1');
  });

  it('counts an rc as newer than a nightly of the same X.Y.Z', () => {
    const releases = [
      release('v1.3.0-nightly.20261117', { prerelease: true }),
      release('v1.3.0-rc.1', { prerelease: true }),
    ];
    expect(pickLatestRelease(releases, 'nightly')?.version).toBe('v1.3.0-rc.1');
  });

  it('prefers the stable release over its rc and nightlies', () => {
    const releases = [
      release('v1.3.0-nightly.20261117', { prerelease: true }),
      release('v1.3.0-rc.3', { prerelease: true }),
      release('v1.3.0'),
    ];
    expect(pickLatestRelease(releases, 'nightly')?.version).toBe('v1.3.0');
  });

  it('copes with empty or invalid input', () => {
    expect(pickLatestRelease([], 'stable')).toBeNull();
    expect(pickLatestRelease(null, 'rc')).toBeNull();
    expect(pickLatestRelease({ message: 'Not Found' }, 'stable')).toBeNull();
    expect(pickLatestRelease([null, {}, { tag_name: '' }], 'stable')).toBeNull();
  });
});
