import type { AppsListing } from '@/features/apps/domain/app-list';
import type { CoverCandidate } from '@/features/apps/domain/cover-finder';
import type { LauncherDownload } from '@/features/apps/domain/launcher';

/** Outcome of a host action: the host answers `{ status, error? }`. */
export interface ActionResult {
  status: boolean;
  error?: string;
}

/** The applications API of the host (`./api/apps*`). */
export interface AppsPort {
  list(signal?: AbortSignal): Promise<AppsListing>;
  reorder(order: readonly string[]): Promise<ActionResult>;
  launch(uuid: string): Promise<ActionResult>;
  close(): Promise<ActionResult>;
  remove(uuid: string): Promise<ActionResult>;
  /** Create (no uuid) or replace (same uuid) an app with `POST ./api/apps`. */
  save(app: Record<string, unknown>): Promise<ActionResult>;
}

/** Online cover finder: the GameDB search and the host download of the chosen cover. */
export interface CoversPort {
  /** Covers of the games whose name starts with `name`; an empty name makes no request. Rejects when the search fails. */
  search(name: string, signal?: AbortSignal): Promise<CoverCandidate[]>;
  /** Have the host download the cover; resolves with the path it stored it at. */
  upload(candidate: CoverCandidate): Promise<string>;
}

/** What the page needs from the browser; a port so tests and the UI never touch `window`. */
export interface AppsBrowser {
  /** `location.hostname` of the page. */
  hostname: string;
  /** Navigate to a custom-scheme link (the `art://` launch link). */
  openLink(href: string): void;
  download(file: LauncherDownload): void;
}
