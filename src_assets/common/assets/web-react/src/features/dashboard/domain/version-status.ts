import type { HeliosVersion, ReleaseChannel } from './helios-version';

export type VersionNotice =
  { kind: 'dirty' } | { kind: 'pre-release' } | { kind: 'update'; latest: HeliosVersion } | { kind: 'latest' };

export type ChannelLabel = 'Nightly' | 'RC' | 'Beta';

export interface VersionStatus {
  /** Label of the installed pre-release channel (none for stable). */
  channelLabel: ChannelLabel | null;
  /** Alerts to show, in order. While loading only the local ones (dirty, pre-release) can appear. */
  notices: VersionNotice[];
}

const CHANNEL_LABELS: Partial<Record<ReleaseChannel, ChannelLabel>> = {
  nightly: 'Nightly',
  rc: 'RC',
  beta: 'Beta',
};

/** A local build: 5 dot-separated parts that contain "dirty" (`0.0.0.abc1234.dirty`). */
export function isDirtyBuild(version: string): boolean {
  return version.split('.').length === 5 && version.includes('dirty');
}

export function isPreRelease(installed: HeliosVersion): boolean {
  return !!installed.channel && installed.channel !== 'stable';
}

/** What the version card says about the installed version (same rules as the legacy home page). */
export function describeVersion(
  installed: HeliosVersion,
  latest: HeliosVersion | null,
  loading: boolean,
): VersionStatus {
  const dirty = isDirtyBuild(installed.version);
  const preRelease = isPreRelease(installed);
  const notices: VersionNotice[] = [];
  if (dirty) {
    notices.push({ kind: 'dirty' });
  }
  if (preRelease) {
    notices.push({ kind: 'pre-release' });
  }
  if (latest?.isGreater(installed)) {
    notices.push({ kind: 'update', latest });
  } else if (!loading && !dirty && !preRelease) {
    notices.push({ kind: 'latest' });
  }
  return { channelLabel: installed.channel ? (CHANNEL_LABELS[installed.channel] ?? null) : null, notices };
}
