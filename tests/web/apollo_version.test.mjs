// Run with: npm run test:web
import test from 'node:test';
import assert from 'node:assert/strict';
import ApolloVersion, {
  normalizeUpdateChannel,
  pickLatestRelease,
  resolveUpdateChannel,
} from '../../src_assets/common/assets/web/apollo_version.js';

const v = (version) => new ApolloVersion(null, version);
const release = (tag, extra = {}) => ({ tag_name: tag, name: `Apollo ${tag}`, ...extra });

test('parses stable, rc, nightly and beta versions', () => {
  assert.deepEqual([v('v1.3.0').channel, v('v1.3.0').channelNumber], ['stable', 0]);
  assert.deepEqual([v('1.3.0-rc.2').channel, v('1.3.0-rc.2').channelNumber], ['rc', 2]);
  assert.deepEqual([v('1.3.0-nightly.20261116').channel, v('1.3.0-nightly.20261116').channelNumber], ['nightly', 20261116]);
  assert.deepEqual([v('1.3.0-beta.5').channel, v('1.3.0-beta.5').channelNumber], ['beta', 5]);
  assert.equal(v('1.3.0-alpha.1').channel, 'beta');
  assert.deepEqual(v('v12.34.56').versionParts, [12, 34, 56]);
});

test('local dirty builds count as stable builds of their own number', () => {
  const dirty = v('0.0.0.395aa4ef.dirty');
  assert.equal(dirty.channel, 'stable');
  assert.deepEqual(dirty.versionParts, [0, 0, 0]);
  assert.equal(v('1.0.0').isGreater(dirty), true);
});

test('unparsable versions are never greater or lower', () => {
  assert.equal(v('latest').compare('1.0.0'), 0);
  assert.equal(v('1.0.0').compare('latest'), 0);
  assert.equal(v('latest').isGreater('1.0.0'), false);
});

test('orders by X.Y.Z, then channel, then number', () => {
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
  for (let i = 0; i < order.length; i++) {
    for (let j = 0; j < order.length; j++) {
      const expected = Math.sign(i - j);
      assert.equal(v(order[i]).compare(order[j]), expected, `${order[i]} vs ${order[j]}`);
    }
  }
});

test('an installed rc must be offered the stable of the same version', () => {
  assert.equal(v('1.3.0').isGreater('1.3.0-rc.4'), true);
  assert.equal(v('1.3.0-rc.4').isGreater('1.3.0'), false);
});

test('normalizeUpdateChannel only accepts known channels', () => {
  assert.equal(normalizeUpdateChannel('rc'), 'rc');
  assert.equal(normalizeUpdateChannel(' Nightly '), 'nightly');
  assert.equal(normalizeUpdateChannel(''), null);
  assert.equal(normalizeUpdateChannel('beta'), null);
  assert.equal(normalizeUpdateChannel(undefined), null);
});

test('resolveUpdateChannel follows the setting, the legacy option, then the installed channel', () => {
  assert.equal(resolveUpdateChannel('nightly', 'disabled', v('1.0.0')), 'nightly');
  assert.equal(resolveUpdateChannel('', 'enabled', v('1.0.0')), 'rc');
  assert.equal(resolveUpdateChannel(undefined, 'disabled', v('1.0.0')), 'stable');
  assert.equal(resolveUpdateChannel('', 'disabled', v('1.3.0-nightly.20261116')), 'nightly');
  assert.equal(resolveUpdateChannel('', 'disabled', v('1.3.0-rc.1')), 'rc');
  assert.equal(resolveUpdateChannel('stable', 'enabled', v('1.3.0-nightly.1')), 'stable');
});

test('pickLatestRelease respects the update channel', () => {
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
  assert.equal(pickLatestRelease(releases, 'stable').version, 'v1.2.1');
  assert.equal(pickLatestRelease(releases, 'rc').version, 'v1.3.0-rc.2');
  assert.equal(pickLatestRelease(releases, 'nightly').version, 'v1.4.0-nightly.20261117');
  assert.equal(pickLatestRelease(releases, 'unknown').version, 'v1.2.1');
});

test('with the same X.Y.Z an rc is newer than a nightly', () => {
  const releases = [
    release('v1.3.0-nightly.20261117', { prerelease: true }),
    release('v1.3.0-rc.1', { prerelease: true }),
  ];
  assert.equal(pickLatestRelease(releases, 'nightly').version, 'v1.3.0-rc.1');
});

test('pickLatestRelease prefers the stable release over its rc and nightlies', () => {
  const releases = [
    release('v1.3.0-nightly.20261117', { prerelease: true }),
    release('v1.3.0-rc.3', { prerelease: true }),
    release('v1.3.0'),
  ];
  assert.equal(pickLatestRelease(releases, 'nightly').version, 'v1.3.0');
});

test('pickLatestRelease copes with empty or invalid input', () => {
  assert.equal(pickLatestRelease([], 'stable'), null);
  assert.equal(pickLatestRelease(null, 'rc'), null);
  assert.equal(pickLatestRelease({ message: 'Not Found' }, 'stable'), null);
});
