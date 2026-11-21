/** Release channels, from the least to the most stable. */
export type ReleaseChannel = 'nightly' | 'beta' | 'rc' | 'stable';

/** Channels a user can follow for update notifications. */
export type UpdateChannel = 'stable' | 'rc' | 'nightly';

/** The part of a GitHub release the dashboard needs (`GET /repos/<repo>/releases`). */
export interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
}

const CHANNEL_RANK: Readonly<Record<ReleaseChannel, number>> = {
  nightly: 0,
  beta: 1,
  rc: 2,
  stable: 3,
};

/** Release channels each update channel may be notified about. */
const UPDATE_CHANNELS: Readonly<Record<UpdateChannel, readonly ReleaseChannel[]>> = {
  stable: ['stable'],
  rc: ['stable', 'rc', 'beta'],
  nightly: ['stable', 'rc', 'beta', 'nightly'],
};

const LEGACY_ENABLED = new Set(['enabled', 'true', 'on', 'yes', '1']);

export interface ParsedVersion {
  core: readonly [number, number, number];
  channel: ReleaseChannel;
  /** The N in "-rc.N" / "-nightly.N" (0 for stable versions). */
  number: number;
}

function isReleaseChannel(label: string): label is ReleaseChannel {
  return Object.hasOwn(CHANNEL_RANK, label);
}

/**
 * Parse a version string like "v1.3.0", "1.3.0-rc.2" or "1.3.0-nightly.20261116".
 * Local builds like "0.0.0.abc1234.dirty" are accepted and treated as stable builds of 0.0.0.
 * Unknown pre-release labels (alpha, ...) are treated like beta.
 */
export function parseVersion(version: unknown): ParsedVersion | null {
  if (!version || typeof version !== 'string') {
    return null;
  }
  const text = version.trim().replace(/^v/i, '');
  const core = /^(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (!core) {
    return null;
  }
  let channel: ReleaseChannel = 'stable';
  let number = 0;
  const pre = /-([A-Za-z]+)(?:\.(\d+))?/.exec(text);
  if (pre) {
    const label = (pre[1] ?? '').toLowerCase();
    channel = isReleaseChannel(label) && label !== 'stable' ? label : 'beta';
    number = pre[2] ? parseInt(pre[2], 10) : 0;
  }
  return {
    core: [parseInt(core[1] ?? '0', 10), parseInt(core[2] ?? '0', 10), parseInt(core[3] ?? '0', 10)],
    channel,
    number,
  };
}

/** A Helios version (installed or from a release) that can be compared with another. */
export class HeliosVersion {
  readonly version: string;
  readonly release: GithubRelease | null;
  /** X.Y.Z, or null when the version cannot be parsed. */
  readonly parts: readonly [number, number, number] | null;
  /** Null when the version cannot be parsed. */
  readonly channel: ReleaseChannel | null;
  readonly channelNumber: number;

  constructor(version: string, release: GithubRelease | null = null) {
    if (!version) {
      throw new Error('A version is required');
    }
    this.version = version;
    this.release = release;
    const parsed = parseVersion(version);
    this.parts = parsed ? parsed.core : null;
    this.channel = parsed ? parsed.channel : null;
    this.channelNumber = parsed ? parsed.number : 0;
  }

  static fromRelease(release: GithubRelease): HeliosVersion {
    return new HeliosVersion(release.tag_name ?? '', release);
  }

  /**
   * Compare using X.Y.Z first, then the channel (nightly < beta < rc < stable) and finally the pre-release number.
   * @returns 1 if this is newer, -1 if older, 0 if equal or not comparable
   */
  compare(otherVersion: HeliosVersion | string): number {
    const other = typeof otherVersion === 'string' ? new HeliosVersion(otherVersion) : otherVersion;
    if (!this.parts || !other.parts || !this.channel || !other.channel) {
      return 0;
    }
    for (let i = 0; i < 3; i++) {
      const mine = this.parts[i] ?? 0;
      const theirs = other.parts[i] ?? 0;
      if (mine !== theirs) {
        return mine > theirs ? 1 : -1;
      }
    }
    if (this.channel !== other.channel) {
      return CHANNEL_RANK[this.channel] > CHANNEL_RANK[other.channel] ? 1 : -1;
    }
    if (this.channelNumber !== other.channelNumber) {
      return this.channelNumber > other.channelNumber ? 1 : -1;
    }
    return 0;
  }

  isGreater(otherVersion: HeliosVersion | string): boolean {
    return this.compare(otherVersion) > 0;
  }
}

/** Normalize a configured update channel; null if the value is empty or unknown. */
export function normalizeUpdateChannel(value: unknown): UpdateChannel | null {
  const channel = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(UPDATE_CHANNELS, channel) ? (channel as UpdateChannel) : null;
}

/**
 * Decide which update channel to follow.
 * 1. the channel chosen in the settings (update_channel)
 * 2. "rc" if the legacy notify_pre_releases option is enabled
 * 3. the channel of the installed version (nightly and rc builds keep following their own channel)
 * 4. stable
 */
export function resolveUpdateChannel(
  configured: unknown,
  legacyNotifyPreReleases: unknown,
  installed: HeliosVersion | null,
): UpdateChannel {
  const chosen = normalizeUpdateChannel(configured);
  if (chosen) {
    return chosen;
  }
  if (LEGACY_ENABLED.has(String(legacyNotifyPreReleases).toLowerCase())) {
    return 'rc';
  }
  if (installed?.channel === 'nightly') {
    return 'nightly';
  }
  if (installed?.channel === 'rc' || installed?.channel === 'beta') {
    return 'rc';
  }
  return 'stable';
}

/** Pick the newest release a channel may be notified about (drafts and tags that do not parse are skipped). */
export function pickLatestRelease(releases: unknown, updateChannel: string): HeliosVersion | null {
  const accepted = UPDATE_CHANNELS[normalizeUpdateChannel(updateChannel) ?? 'stable'];
  let best: HeliosVersion | null = null;
  for (const release of Array.isArray(releases) ? (releases as (GithubRelease | null)[]) : []) {
    if (!release || release.draft || !release.tag_name) {
      continue;
    }
    const candidate = HeliosVersion.fromRelease(release);
    if (!candidate.parts || !candidate.channel || !accepted.includes(candidate.channel)) {
      continue;
    }
    if (!best || candidate.isGreater(best)) {
      best = candidate;
    }
  }
  return best;
}
