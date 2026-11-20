import type { AppsListing } from '@/features/apps/domain/app-list';
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

/** What the page needs from the browser; a port so tests and the UI never touch `window`. */
export interface AppsBrowser {
  /** `location.hostname` of the page. */
  hostname: string;
  /** Navigate to a custom-scheme link (the `art://` launch link). */
  openLink(href: string): void;
  download(file: LauncherDownload): void;
}
