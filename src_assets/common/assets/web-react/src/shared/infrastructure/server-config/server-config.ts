import { AppError, parsePlatform, type Platform } from '@/shared/kernel';
import type { HttpClient } from '@/shared/infrastructure/http';

/** Response of `GET /api/config` (getConfig in src/confighttp.cpp): metadata plus every option as a string. */
export interface ServerConfigDto {
  status?: boolean;
  platform?: unknown;
  version?: unknown;
  update_repo?: unknown;
  vdisplayStatus?: unknown;
  [option: string]: unknown;
}

export interface ServerConfig {
  platform: Platform;
  version: string;
  updateRepo: string | null;
  /** Virtual display driver status, Windows only. */
  vdisplayStatus: number | null;
  /** Options read from the config file, keyed by option name, as the server sent them. */
  options: Readonly<Record<string, string>>;
}

const METADATA_KEYS = new Set(['status', 'platform', 'version', 'update_repo', 'vdisplayStatus']);

export function toServerConfig(dto: ServerConfigDto): ServerConfig {
  const platform = parsePlatform(dto.platform);
  if (platform === null) {
    throw new AppError('parse', `Unsupported platform: ${String(dto.platform)}`, { body: dto });
  }
  const options: Record<string, string> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (!METADATA_KEYS.has(key) && value !== undefined && value !== null) {
      options[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  return {
    platform,
    version: typeof dto.version === 'string' ? dto.version : '',
    updateRepo: typeof dto.update_repo === 'string' && dto.update_repo !== '' ? dto.update_repo : null,
    vdisplayStatus: typeof dto.vdisplayStatus === 'number' ? dto.vdisplayStatus : null,
    options,
  };
}

export async function fetchServerConfig(http: HttpClient, signal?: AbortSignal): Promise<ServerConfig> {
  const dto = await http.getJson<ServerConfigDto>('./api/config', signal ? { signal } : {});
  return toServerConfig(dto);
}
