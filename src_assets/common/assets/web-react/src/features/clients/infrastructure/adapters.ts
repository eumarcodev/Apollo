import type { ClientsPort, UpdateResult } from '@/features/clients/application/ports';
import type { ClientCommand, PairedClient } from '@/features/clients/domain/client';
import { parsePerm } from '@/features/clients/domain/permissions';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';
import { AppError, type BooleanLike } from '@/shared/kernel';

/** One entry of `named_certs` (`nvhttp::get_all_clients` in src/nvhttp.cpp). */
export interface ClientDto {
  name?: unknown;
  uuid?: unknown;
  display_mode?: unknown;
  perm?: unknown;
  connected?: unknown;
  do?: unknown;
  undo?: unknown;
  allow_client_commands?: unknown;
  enable_legacy_ordering?: unknown;
  always_use_virtual_display?: unknown;
}

/** `GET /api/clients/list`. */
export interface ClientListDto {
  status?: unknown;
  platform?: unknown;
  named_certs?: unknown;
}

interface StatusDto {
  status?: unknown;
  message?: unknown;
  error?: unknown;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function booleanLike(value: unknown, fallback: boolean): BooleanLike {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string' ? value : fallback;
}

function toCommands(value: unknown): ClientCommand[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry: { cmd?: unknown; elevated?: unknown } | null) => ({
    cmd: text(entry?.cmd),
    elevated: booleanLike(entry?.elevated, false),
  }));
}

export function toPairedClient(dto: ClientDto): PairedClient {
  return {
    uuid: text(dto.uuid),
    name: text(dto.name),
    displayMode: text(dto.display_mode),
    perm: parsePerm(dto.perm),
    connected: dto.connected === true,
    doCmds: toCommands(dto.do),
    undoCmds: toCommands(dto.undo),
    allowClientCommands: booleanLike(dto.allow_client_commands, true),
    enableLegacyOrdering: booleanLike(dto.enable_legacy_ordering, true),
    alwaysUseVirtualDisplay: booleanLike(dto.always_use_virtual_display, false),
  };
}

/** Empty when the host answers `status: false` or without devices (legacy: "There are no paired devices"). */
export function toPairedClients(dto: ClientListDto | undefined): PairedClient[] {
  if (!dto?.status || !Array.isArray(dto.named_certs)) {
    return [];
  }
  return (dto.named_certs as ClientDto[]).map(toPairedClient);
}

/**
 * The legacy page read the JSON body whatever the HTTP status: an error answer such as `{ status: false, error }` is a
 * value. Other failures (network, 401, invalid JSON) propagate.
 */
async function readingErrors<T>(run: () => Promise<T | undefined>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppError && error.kind === 'http' && error.body && typeof error.body === 'object') {
      return error.body as T;
    }
    throw error;
  }
}

export function createClientsApi(http: HttpClient = httpClient): ClientsPort {
  return {
    async list(signal) {
      const dto = await readingErrors<ClientListDto>(() =>
        http.getJson<ClientListDto>('./api/clients/list', signal ? { signal } : undefined),
      );
      return toPairedClients(dto);
    },
    async update(payload) {
      const dto = await readingErrors<StatusDto>(() => http.postJson<StatusDto>('./api/clients/update', payload));
      if (dto?.status) {
        return { ok: true } satisfies UpdateResult;
      }
      const message = typeof dto?.message === 'string' && dto.message ? dto.message : text(dto?.error);
      return message ? { ok: false, message } : { ok: false };
    },
    async disconnect(uuid) {
      await readingErrors(() => http.postJson('./api/clients/disconnect', { uuid }));
    },
    async unpair(uuid) {
      await readingErrors(() => http.postJson('./api/clients/unpair', { uuid }));
    },
    async unpairAll() {
      const dto = await readingErrors<StatusDto>(() => http.postJson<StatusDto>('./api/clients/unpair-all', {}));
      return dto?.status === true;
    },
  };
}
