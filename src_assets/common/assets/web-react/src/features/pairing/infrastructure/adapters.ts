import type { HostInfoStore, OtpAnswer, PageEnvironment, PairingPort } from '@/features/pairing/application/ports';
import { parseStoredHostInfo } from '@/features/pairing/domain/host-address';
import { AppError } from '@/shared/kernel';
import { httpClient, type HttpClient } from '@/shared/infrastructure/http';

/** `POST /api/pin` and `POST /api/otp` bodies (src/confighttp.cpp savePin / getOTP). */
interface PinDto {
  status?: unknown;
}

interface OtpDto {
  status?: unknown;
  otp?: unknown;
  ip?: unknown;
  name?: unknown;
  message?: unknown;
}

/**
 * The legacy page read the JSON body whatever the HTTP status: a 400 (`{ status: false, error }`) is an answer, not a
 * failed request. Other errors (network, 401, invalid JSON) propagate.
 */
async function postReadingErrors<T>(http: HttpClient, path: string, body: unknown): Promise<T | undefined> {
  try {
    return await http.postJson<T>(path, body);
  } catch (error) {
    if (error instanceof AppError && error.kind === 'http' && error.body && typeof error.body === 'object') {
      return error.body as T;
    }
    throw error;
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

export function toOtpAnswer(dto: OtpDto | undefined): OtpAnswer {
  if (!dto?.status) {
    return typeof dto?.message === 'string' && dto.message ? { ok: false, message: dto.message } : { ok: false };
  }
  return { ok: true, otp: text(dto.otp), ip: text(dto.ip), hostName: text(dto.name) };
}

export function createPairingApi(http: HttpClient = httpClient): PairingPort {
  return {
    async sendPin({ pin, name }) {
      const dto = await postReadingErrors<PinDto>(http, './api/pin', { pin, name });
      return dto?.status === true;
    },
    async requestOtp({ passphrase, deviceName }) {
      return toOtpAnswer(await postReadingErrors<OtpDto>(http, './api/otp', { passphrase, deviceName }));
    },
  };
}

export const HOST_INFO_KEY = 'hostInfo';

/** `sessionStorage.hostInfo`; storage that cannot be read or written (private mode, blocked) behaves as empty. */
export function createSessionHostStore(storage: () => Storage = () => window.sessionStorage): HostInfoStore {
  return {
    load() {
      try {
        return parseStoredHostInfo(storage().getItem(HOST_INFO_KEY));
      } catch {
        return null;
      }
    },
    save(info) {
      try {
        storage().setItem(HOST_INFO_KEY, JSON.stringify({ hostAddr: info.hostAddr, hostPort: info.hostPort }));
      } catch (error) {
        console.error(error);
      }
    },
  };
}

export function createBrowserEnvironment(win: Window = window): PageEnvironment {
  return {
    hostname: () => win.location.hostname,
    port: () => win.location.port,
    hash: () => win.location.hash,
    setHash: (hash) => {
      win.location.hash = hash;
    },
    openLink: (url) => {
      win.open(url);
    },
  };
}
