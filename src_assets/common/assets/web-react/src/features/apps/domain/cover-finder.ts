/** Where the LizardByte GameDB (a static JSON site) is read from; raw.githubusercontent.com avoids CORS issues. */
export const GAMEDB_URL = 'https://raw.githubusercontent.com/LizardByte/GameDB/gh-pages';

const IGDB_URL = 'https://images.igdb.com/igdb/image/upload';

/** A cover the user can pick: `url` is the preview, `saveUrl` the larger image the host downloads. */
export interface CoverCandidate {
  name: string;
  /** Name of the file the host stores the cover under (`igdb_<game id>`). */
  key: string;
  url: string;
  saveUrl: string;
}

/** Entry of a GameDB bucket: the game id and its name. */
export interface BucketEntry {
  id: string;
  name: string;
}

/** The GameDB shard of a name: its first two characters, lower-case, letters and digits only; `@` when none are left. */
export function coverSearchBucket(name: string): string {
  const bucket = name
    .substring(0, Math.min(name.length, 2))
    .toLowerCase()
    .replaceAll(/[^a-z\d]/g, '');
  return bucket === '' ? '@' : bucket;
}

/** Form compared by the prefix match: whitespace runs become `.`, lower-case. */
export function coverNameKey(name: string): string {
  return name.replaceAll(/\s+/g, '.').toLowerCase();
}

/** Bucket entries (`{ <id>: { name } }`) whose name starts with the searched name; a malformed bucket yields none. */
export function matchingBucketEntries(bucket: unknown, name: string): BucketEntry[] {
  if (typeof bucket !== 'object' || bucket === null) {
    return [];
  }
  const wanted = coverNameKey(name);
  const entries: BucketEntry[] = [];
  for (const [id, item] of Object.entries(bucket)) {
    const itemName = (item as { name?: unknown } | null)?.name;
    if (typeof itemName === 'string' && coverNameKey(itemName).startsWith(wanted)) {
      entries.push({ id, name: itemName });
    }
  }
  return entries;
}

/** Candidate of a GameDB game document; null without a cover thumb URL or a usable slug (the file name of the thumb). */
export function toCoverCandidate(game: unknown): CoverCandidate | null {
  const doc = game as { id?: unknown; name?: unknown; cover?: { url?: unknown } | null } | null;
  const thumb = doc?.cover?.url;
  if (typeof thumb !== 'string' || thumb === '') {
    return null;
  }
  const dot = thumb.lastIndexOf('.');
  const slash = thumb.lastIndexOf('/');
  if (dot < 0 || slash < 0) {
    return null;
  }
  const slug = thumb.substring(slash + 1, dot);
  return {
    name: String(doc?.name ?? ''),
    key: `igdb_${String(doc?.id)}`,
    url: `${IGDB_URL}/t_cover_big/${slug}.jpg`,
    saveUrl: `${IGDB_URL}/t_cover_big_2x/${slug}.png`,
  };
}
