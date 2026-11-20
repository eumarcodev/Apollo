/** Source of the published releases of the host repository (GitHub). */
export interface ReleasesPort {
  /** Raw `GET /repos/<repo>/releases?per_page=30` body (validated by the domain, not here). */
  listReleases(repo: string, signal?: AbortSignal): Promise<unknown>;
}

/** The host log (`GET ./api/logs`). */
export interface HostLogPort {
  readLog(signal?: AbortSignal): Promise<string>;
}

/** Repository checked for updates when the host does not report one. */
export const DEFAULT_UPDATE_REPO = 'eumarcodev/Helios-Server';
