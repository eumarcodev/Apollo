import { describe, expect, it } from 'vitest';
import { HeliosVersion } from './helios-version';
import { describeVersion, isDirtyBuild } from './version-status';

const v = (version: string) => new HeliosVersion(version);

describe('isDirtyBuild', () => {
  it('needs 5 dot-separated parts and the word dirty', () => {
    expect(isDirtyBuild('0.0.0.830cbec0.dirty')).toBe(true);
    expect(isDirtyBuild('0.0.0.830cbec0')).toBe(false);
    expect(isDirtyBuild('1.2.3-dirty')).toBe(false);
    expect(isDirtyBuild('1.2.3.abc.clean')).toBe(false);
  });
});

describe('describeVersion', () => {
  it('says the stable build is the latest once the check finished', () => {
    expect(describeVersion(v('1.2.0'), v('v1.2.0'), false)).toEqual({
      channelLabel: null,
      notices: [{ kind: 'latest' }],
    });
    expect(describeVersion(v('1.2.0'), null, false).notices).toEqual([{ kind: 'latest' }]);
  });

  it('says nothing about being up to date while the check is loading', () => {
    expect(describeVersion(v('1.2.0'), null, true).notices).toEqual([]);
  });

  it('announces an update with the release that is newer', () => {
    const latest = v('v1.3.0');
    expect(describeVersion(v('1.2.0'), latest, false).notices).toEqual([{ kind: 'update', latest }]);
    expect(describeVersion(v('1.2.0'), latest, true).notices).toEqual([{ kind: 'update', latest }]);
  });

  it('labels pre-releases and warns about them', () => {
    expect(describeVersion(v('1.3.0-rc.2'), null, false)).toEqual({
      channelLabel: 'RC',
      notices: [{ kind: 'pre-release' }],
    });
    expect(describeVersion(v('1.3.0-nightly.1'), null, false).channelLabel).toBe('Nightly');
    expect(describeVersion(v('1.3.0-beta.1'), null, false).channelLabel).toBe('Beta');
  });

  it('thanks a dirty build and never calls it the latest', () => {
    expect(describeVersion(v('0.0.0.830cbec0.dirty'), null, false)).toEqual({
      channelLabel: null,
      notices: [{ kind: 'dirty' }],
    });
  });

  it('keeps the dirty and update notices together, as the legacy page did', () => {
    const latest = v('v1.0.0');
    expect(describeVersion(v('0.0.0.830cbec0.dirty'), latest, false).notices).toEqual([
      { kind: 'dirty' },
      { kind: 'update', latest },
    ]);
  });

  it('shows no label for a version that cannot be parsed', () => {
    expect(describeVersion(v('latest'), null, false).channelLabel).toBeNull();
  });
});
