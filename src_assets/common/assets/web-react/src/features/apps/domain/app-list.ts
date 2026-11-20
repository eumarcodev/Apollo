import type { AppEntry } from './app-entry';

/** What `GET ./api/apps` tells the page. */
export interface AppsListing {
  apps: AppEntry[];
  /** uuid of the running application, empty when none runs. */
  currentApp: string;
  hostName: string;
  hostUuid: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Read the `GET ./api/apps` body; entries without a uuid are dropped (the legacy page does the same). */
export function parseAppsListing(body: unknown): AppsListing {
  const record = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const rawApps = Array.isArray(record['apps']) ? (record['apps'] as unknown[]) : [];
  const apps: AppEntry[] = [];
  for (const raw of rawApps) {
    if (raw && typeof raw === 'object' && 'uuid' in raw && (raw as { uuid: unknown }).uuid) {
      const entry = raw as Record<string, unknown>;
      apps.push({ ...entry, uuid: text(entry['uuid']), name: text(entry['name']) });
    }
  }
  return {
    apps,
    currentApp: text(record['current_app']),
    hostName: text(record['host_name']),
    hostUuid: text(record['host_uuid']),
  };
}

export function sameOrder(a: readonly AppEntry[], b: readonly AppEntry[]): boolean {
  return a.length === b.length && a.every((app, index) => app.uuid === b[index]?.uuid);
}

export interface AlphabetizeResult {
  apps: AppEntry[];
  /** False when the list was already in alphabetical order (nothing to save). */
  changed: boolean;
}

/** Sort by name with `localeCompare` (stable); `changed` tells whether the order moved. */
export function alphabetize(apps: readonly AppEntry[]): AlphabetizeResult {
  const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
  return { apps: sorted, changed: !sameOrder(apps, sorted) };
}

export type DropPosition = 'before' | 'after';

/**
 * Move the apps in `movingUuids` next to `targetUuid` (keeping their relative order). Returns the same array when
 * nothing moves (unknown target, dropping on itself, or the apps already sit there).
 */
export function moveApps(
  apps: readonly AppEntry[],
  movingUuids: ReadonlySet<string>,
  targetUuid: string,
  position: DropPosition,
): readonly AppEntry[] {
  if (movingUuids.has(targetUuid) || !apps.some((app) => app.uuid === targetUuid)) {
    return apps;
  }
  const moving = apps.filter((app) => movingUuids.has(app.uuid));
  if (moving.length === 0) {
    return apps;
  }
  const rest = apps.filter((app) => !movingUuids.has(app.uuid));
  const at = rest.findIndex((app) => app.uuid === targetUuid);
  const next = [
    ...rest.slice(0, position === 'before' ? at : at + 1),
    ...moving,
    ...rest.slice(position === 'before' ? at : at + 1),
  ];
  return sameOrder(apps, next) ? apps : next;
}

/** Body of `POST ./api/apps/reorder`. */
export function reorderPayload(apps: readonly AppEntry[]): { order: string[] } {
  return { order: apps.filter((app) => app.uuid).map((app) => app.uuid) };
}

/** Only hostnames the browser treats as this machine launch through the host (legacy list, kept as is). */
export function isLocalHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}
