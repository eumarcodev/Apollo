import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { alphabetize, moveApps, reorderPayload, type DropPosition } from '@/features/apps/domain/app-list';
import type { AppEntry } from '@/features/apps/domain/app-entry';
import { AppError } from '@/shared/kernel';
import type { ActionResult, AppsPort } from './ports';

export const APPS_QUERY_KEY = ['apps', 'list'] as const;

export interface AppsController {
  isLoading: boolean;
  error: AppError | null;
  /** Apps in the order shown (the saved order until the user changes it). */
  apps: readonly AppEntry[];
  currentApp: string;
  hostName: string;
  hostUuid: string;
  /** The shown order differs from the saved one. */
  reordered: boolean;
  /** An action request is running: every action button is disabled. */
  busy: boolean;
  /** Sort alphabetically; false when the list already was. */
  alphabetize(): boolean;
  move(movingUuids: ReadonlySet<string>, targetUuid: string, position: DropPosition): void;
  saveOrder(): Promise<ActionResult>;
  launch(uuid: string): Promise<ActionResult>;
  close(): Promise<ActionResult>;
  remove(uuid: string): Promise<ActionResult>;
  reload(): Promise<unknown>;
}

function failure(error: unknown): ActionResult {
  return { status: false, error: AppError.from(error).message };
}

/**
 * Applications list: the host data, the local order the user is editing and the actions. Every action reloads the
 * list afterwards, even when it fails (a reload also drops an unsaved order, as the legacy page did).
 */
export function useApps(port: AppsPort): AppsController {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: APPS_QUERY_KEY, queryFn: ({ signal }) => port.list(signal) });
  const [busy, setBusy] = useState(false);

  // The local order belongs to one load of the list: a new load (dataUpdatedAt) starts from the saved order.
  const [local, setLocal] = useState<{ version: number; apps: readonly AppEntry[]; reordered: boolean } | null>(null);
  const version = query.dataUpdatedAt;
  const current = local && local.version === version ? local : null;
  const apps = current?.apps ?? query.data?.apps ?? [];
  const reordered = current?.reordered ?? false;

  const reload = useCallback(() => queryClient.refetchQueries({ queryKey: APPS_QUERY_KEY }), [queryClient]);

  const run = useCallback(
    async (action: () => Promise<ActionResult>): Promise<ActionResult> => {
      setBusy(true);
      try {
        return await action().catch(failure);
      } finally {
        try {
          await reload();
        } finally {
          setBusy(false);
        }
      }
    },
    [reload],
  );

  return {
    isLoading: query.isPending,
    error: query.error ? AppError.from(query.error) : null,
    apps,
    currentApp: query.data?.currentApp ?? '',
    hostName: query.data?.hostName ?? '',
    hostUuid: query.data?.hostUuid ?? '',
    reordered,
    busy,
    alphabetize() {
      const result = alphabetize(apps);
      if (!result.changed) {
        return false;
      }
      setLocal({ version, apps: result.apps, reordered: true });
      return true;
    },
    move(movingUuids, targetUuid, position) {
      const next = moveApps(apps, movingUuids, targetUuid, position);
      if (next !== apps) {
        setLocal({ version, apps: next, reordered: true });
      }
    },
    saveOrder: () => run(() => port.reorder(reorderPayload(apps).order)),
    launch: (uuid) => run(() => port.launch(uuid)),
    close: () => run(() => port.close()),
    remove: (uuid) => run(() => port.remove(uuid)),
    reload,
  };
}
