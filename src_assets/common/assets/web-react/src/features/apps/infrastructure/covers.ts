import type { CoversPort } from '@/features/apps/application/ports';
import {
  coverSearchBucket,
  GAMEDB_URL,
  matchingBucketEntries,
  toCoverCandidate,
  type CoverCandidate,
} from '@/features/apps/domain/cover-finder';
import { httpClient, type FetchLike, type HttpClient } from '@/shared/infrastructure/http';
import { AppError } from '@/shared/kernel';

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

/** Cover finder adapter: the LizardByte GameDB for the search, the host (`./api/covers/upload`) for the download. */
export function createCoversPort(http: HttpClient = httpClient, fetchJson: FetchLike = defaultFetch): CoversPort {
  async function game(id: string, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetchJson(`${GAMEDB_URL}/games/${id}.json`, signal ? { signal } : undefined);
      return response.ok ? await response.json() : null;
    } catch (cause) {
      if (signal?.aborted) {
        throw cause;
      }
      // A game that cannot be read is skipped; the others still show.
      return null;
    }
  }

  return {
    async search(name, signal) {
      const searched = name.trim();
      if (searched === '') {
        return [];
      }
      const response = await fetchJson(
        `${GAMEDB_URL}/buckets/${coverSearchBucket(searched)}.json`,
        signal ? { signal } : undefined,
      );
      if (!response.ok) {
        throw new AppError('http', 'Failed to search covers');
      }
      const entries = matchingBucketEntries(await response.json(), searched);
      const games = await Promise.all(entries.map((entry) => game(entry.id, signal)));
      return games.map(toCoverCandidate).filter((candidate): candidate is CoverCandidate => candidate !== null);
    },
    async upload(candidate) {
      const body = await http.postJson<{ path?: unknown }>('./api/covers/upload', {
        key: candidate.key,
        url: candidate.saveUrl,
      });
      if (typeof body?.path !== 'string') {
        throw new AppError('parse', 'The host did not return the cover path');
      }
      return body.path;
    },
  };
}
