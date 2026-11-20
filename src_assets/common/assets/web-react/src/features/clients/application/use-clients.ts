import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildUpdatePayload,
  createDraft,
  isValidDisplayMode,
  type ClientDraft,
  type PairedClient,
} from '@/features/clients/domain/client';
import type { ClientsPort } from './ports';

export const CLIENTS_QUERY_KEY = ['clients'] as const;

/** Delay before the list is read again after a save or a disconnect (legacy page: 1 s). */
export const REFRESH_DELAY_MS = 1000;

/** How long the "unpaired all" / "error" banner stays (legacy page: 5 s). */
export const UNPAIR_ALL_STATUS_MS = 5000;

export interface ClientsDeps {
  port: ClientsPort;
  /** What the legacy page does when the list cannot be read at all: reload the page. */
  reload?: () => void;
}

export interface Editing {
  uuid: string;
  draft: ClientDraft;
}

export interface ClientsState {
  /** Null until the first answer. */
  clients: PairedClient[] | null;
  /** The one device whose editor is open. */
  editing: Editing | null;
  unpairAllPending: boolean;
  /** `true` / `false` for five seconds after "unpair all"; null otherwise. */
  unpairAllStatus: boolean | null;
  /** Shown after unpairing one device (the session may still be open). */
  unpairNotice: boolean;
  /** Set when the host refused an update or the request failed: the text that follows the error title. */
  saveError: string | null;
}

export interface ClientsActions {
  /** Reads the list again; an open editor is closed first (legacy `refreshClients`). */
  refresh(): Promise<void>;
  startEdit(uuid: string): void;
  cancelEdit(): void;
  updateDraft(patch: Partial<ClientDraft>): void;
  /** Sends the draft; ignored while the display mode override is invalid. */
  save(): Promise<void>;
  disconnect(uuid: string): Promise<void>;
  unpair(uuid: string): Promise<void>;
  unpairAll(): Promise<void>;
  dismissUnpairNotice(): void;
  dismissSaveError(): void;
}

function reloadPage(): void {
  window.location.reload();
}

/** Paired-device list with the legacy page's flows: edit one at a time, save, disconnect, unpair one or all. */
export function useClients({ port, reload = reloadPage }: ClientsDeps): ClientsState & ClientsActions {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [unpairAllPending, setUnpairAllPending] = useState(false);
  const [unpairAllStatus, setUnpairAllStatus] = useState<boolean | null>(null);
  const [unpairNotice, setUnpairNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const alive = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const later = useCallback((action: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);

  // One list read at a time; a newer read replaces a slow older one (react-query keeps only the latest).
  const listing = useQuery<PairedClient[], Error>({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: ({ signal }) => port.list(signal),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const clients = listing.data ?? null;
  const { refetch } = listing;
  const failed = listing.isError;

  useEffect(() => {
    if (failed) {
      console.error(listing.error);
      reload();
    }
  }, [failed, listing.error, reload]);

  const refresh = useCallback(async () => {
    setEditing(null);
    await refetch();
  }, [refetch]);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const timer of pending) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  const startEdit = useCallback(
    (uuid: string) => {
      const client = clients?.find((candidate) => candidate.uuid === uuid);
      if (client) {
        // Opening a device closes the one being edited: its draft is simply replaced.
        setEditing({ uuid, draft: createDraft(client) });
      }
    },
    [clients],
  );

  const cancelEdit = useCallback(() => setEditing(null), []);

  const updateDraft = useCallback((patch: Partial<ClientDraft>) => {
    setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current));
  }, []);

  const save = useCallback(async () => {
    if (!editing || !isValidDisplayMode(editing.draft.displayMode)) {
      return;
    }
    const payload = buildUpdatePayload(editing.uuid, editing.draft);
    setEditing(null);
    setSaveError(null);
    try {
      const result = await port.update(payload);
      if (result.ok) {
        void refresh();
      } else if (alive.current) {
        setSaveError(result.message ?? '');
      }
    } catch (error) {
      console.error(error);
      if (alive.current) {
        setSaveError(String(error));
      }
    } finally {
      later(() => void refresh(), REFRESH_DELAY_MS);
    }
  }, [editing, port, refresh, later]);

  const disconnect = useCallback(
    async (uuid: string) => {
      try {
        await port.disconnect(uuid);
      } catch (error) {
        console.error(error);
      } finally {
        later(() => void refresh(), REFRESH_DELAY_MS);
      }
    },
    [port, refresh, later],
  );

  const unpair = useCallback(
    async (uuid: string) => {
      try {
        await port.unpair(uuid);
      } catch (error) {
        console.error(error);
        return;
      }
      if (alive.current) {
        setUnpairNotice(true);
      }
      await refresh();
    },
    [port, refresh],
  );

  const unpairAll = useCallback(async () => {
    setUnpairAllPending(true);
    let status = false;
    try {
      status = await port.unpairAll();
    } catch (error) {
      console.error(error);
    }
    if (!alive.current) {
      return;
    }
    setUnpairAllPending(false);
    setUnpairAllStatus(status);
    if (statusTimer.current) {
      clearTimeout(statusTimer.current);
    }
    statusTimer.current = later(() => setUnpairAllStatus(null), UNPAIR_ALL_STATUS_MS);
    await refresh();
  }, [port, refresh, later]);

  return {
    clients,
    editing,
    unpairAllPending,
    unpairAllStatus,
    unpairNotice,
    saveError,
    refresh,
    startEdit,
    cancelEdit,
    updateDraft,
    save,
    disconnect,
    unpair,
    unpairAll,
    dismissUnpairNotice: useCallback(() => setUnpairNotice(false), []),
    dismissSaveError: useCallback(() => setSaveError(null), []),
  };
}
