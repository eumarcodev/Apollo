// Release channels, from the least to the most stable.
// Versions look like: 1.3.0 (stable), 1.3.0-rc.2, 1.3.0-nightly.20261116 and 1.3.0-beta.1 (upstream).
const CHANNEL_RANK = {
  nightly: 0,
  beta: 1,
  rc: 2,
  stable: 3,
};

// Release channels each update channel may be notified about.
const UPDATE_CHANNELS = {
  stable: ['stable'],
  rc: ['stable', 'rc', 'beta'],
  nightly: ['stable', 'rc', 'beta', 'nightly'],
};

class ApolloVersion {
  constructor(release = null, version = null) {
    if (release) {
      this.release = release;
      this.version = release.tag_name;
      this.versionName = release.name;
      this.versionTag = release.tag_tag;
    } else if (version) {
      this.release = null;
      this.version = version;
      this.versionName = null;
      this.versionTag = null;
    } else {
      throw new Error('Either release or version must be provided');
    }

    const parsed = ApolloVersion.parse(this.version);
    this.versionParts = parsed ? parsed.core : null;
    this.versionMajor = parsed ? parsed.core[0] : null;
    this.versionMinor = parsed ? parsed.core[1] : null;
    this.versionPatch = parsed ? parsed.core[2] : null;
    // 'stable', 'rc', 'beta' or 'nightly' (null if the version can't be parsed)
    this.channel = parsed ? parsed.channel : null;
    // The N in "-rc.N" / "-nightly.N" (0 for stable versions)
    this.channelNumber = parsed ? parsed.number : 0;
  }

  /**
   * Parse a version string like "v1.3.0", "1.3.0-rc.2" or "1.3.0-nightly.20261116".
   * Local builds like "0.0.0.abc1234.dirty" are accepted and treated as stable builds of 0.0.0.
   * @returns {{core: number[], channel: string, number: number}|null}
   */
  static parse(version) {
    if (!version || typeof version !== 'string') {
      return null;
    }
    const v = version.trim().replace(/^v/i, '');
    const core = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!core) {
      return null;
    }

    let channel = 'stable';
    let number = 0;
    const pre = v.match(/-([A-Za-z]+)(?:\.(\d+))?/);
    if (pre) {
      const label = pre[1].toLowerCase();
      // Unknown pre-release labels (alpha, ...) are treated like beta
      channel = Object.hasOwn(CHANNEL_RANK, label) && label !== 'stable' ? label : 'beta';
      number = pre[2] ? parseInt(pre[2], 10) : 0;
    }

    return {
      core: [parseInt(core[1], 10), parseInt(core[2], 10), parseInt(core[3], 10)],
      channel,
      number,
    };
  }

  /**
   * Compare with another version using X.Y.Z first, then the channel (nightly < beta < rc < stable)
   * and finally the pre-release number.
   * @returns {number} 1 if this is newer, -1 if older, 0 if equal or not comparable
   */
  compare(otherVersion) {
    let other;
    if (otherVersion instanceof ApolloVersion) {
      other = otherVersion;
    } else if (typeof otherVersion === 'string') {
      other = new ApolloVersion(null, otherVersion);
    } else {
      throw new Error('Invalid argument: otherVersion must be a ApolloVersion object or a version string');
    }

    if (!this.versionParts || !other.versionParts) {
      return 0;
    }
    for (let i = 0; i < 3; i++) {
      if (this.versionParts[i] !== other.versionParts[i]) {
        return this.versionParts[i] > other.versionParts[i] ? 1 : -1;
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

  isGreater(otherVersion) {
    return this.compare(otherVersion) > 0;
  }
}

/**
 * Normalize a configured update channel.
 * @returns {'stable'|'rc'|'nightly'|null} null if the value is empty or unknown
 */
function normalizeUpdateChannel(value) {
  const channel = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(UPDATE_CHANNELS, channel) ? channel : null;
}

/**
 * Decide which update channel to follow.
 * 1. the channel chosen in the settings (update_channel)
 * 2. "rc" if the legacy notify_pre_releases option is enabled
 * 3. the channel of the installed version (nightly and rc builds keep following their own channel)
 * 4. stable
 */
function resolveUpdateChannel(configured, legacyNotifyPreReleases, installed) {
  const chosen = normalizeUpdateChannel(configured);
  if (chosen) {
    return chosen;
  }
  if (['enabled', 'true', 'on', 'yes', '1'].includes(String(legacyNotifyPreReleases).toLowerCase())) {
    return 'rc';
  }
  if (installed && installed.channel === 'nightly') {
    return 'nightly';
  }
  if (installed && (installed.channel === 'rc' || installed.channel === 'beta')) {
    return 'rc';
  }
  return 'stable';
}

/**
 * Pick the newest release a channel may be notified about.
 * @param {object[]} releases GitHub releases (as returned by the releases API)
 * @param {string} updateChannel 'stable', 'rc' or 'nightly'
 * @returns {ApolloVersion|null}
 */
function pickLatestRelease(releases, updateChannel) {
  const accepted = UPDATE_CHANNELS[updateChannel] || UPDATE_CHANNELS.stable;
  let best = null;
  for (const release of Array.isArray(releases) ? releases : []) {
    if (!release || release.draft || !release.tag_name) {
      continue;
    }
    const candidate = new ApolloVersion(release, null);
    if (!candidate.versionParts || !accepted.includes(candidate.channel)) {
      continue;
    }
    if (!best || candidate.isGreater(best)) {
      best = candidate;
    }
  }
  return best;
}

export { ApolloVersion, normalizeUpdateChannel, resolveUpdateChannel, pickLatestRelease };
export default ApolloVersion;
