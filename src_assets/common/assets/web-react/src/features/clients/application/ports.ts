import type { PairedClient, UpdateClientPayload } from '@/features/clients/domain/client';

/** Result of `POST ./api/clients/update`: the host's `status`, and its message when it refused. */
export type UpdateResult = { ok: true } | { ok: false; message?: string };

/**
 * Paired-device endpoints of the host. Every method rejects only when the request itself failed (network, session,
 * invalid JSON); an answer with `status: false` is a value.
 */
export interface ClientsPort {
  /** `GET ./api/clients/list`; an empty list when the host reports `status: false` or no devices. */
  list(signal?: AbortSignal): Promise<PairedClient[]>;
  update(payload: UpdateClientPayload): Promise<UpdateResult>;
  disconnect(uuid: string): Promise<void>;
  unpair(uuid: string): Promise<void>;
  /** Resolves to the `status` of the host's answer. */
  unpairAll(): Promise<boolean>;
}
