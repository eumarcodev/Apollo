import type { HostLogPort, ReleasesPort } from '@/features/dashboard/application/ports';
import { AppError } from '@/shared/kernel';
import { httpClient, type FetchLike, type HttpClient } from '@/shared/infrastructure/http';

/**
 * Releases from the public GitHub API. A plain fetch on purpose: the host session cookie must not travel to
 * another origin, and a GitHub 401 must not send the user to the Helios login page.
 */
export function createGithubReleases(fetchImpl: FetchLike = (input, init) => fetch(input, init)): ReleasesPort {
  return {
    async listReleases(repo, signal) {
      const url = `https://api.github.com/repos/${repo}/releases?per_page=30`;
      let response: Response;
      try {
        response = await fetchImpl(url, signal ? { signal } : undefined);
      } catch (cause) {
        throw new AppError('network', `Request to ${url} failed`, { cause });
      }
      if (!response.ok) {
        throw new AppError('http', `GitHub answered ${response.status}`, { status: response.status });
      }
      try {
        return (await response.json()) as unknown;
      } catch (cause) {
        throw new AppError('parse', `Invalid JSON from ${url}`, { cause });
      }
    },
  };
}

export function createHostLog(http: HttpClient = httpClient): HostLogPort {
  return {
    readLog: (signal) => http.getText('./api/logs', signal ? { signal } : {}),
  };
}
