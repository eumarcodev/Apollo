import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { AppError, parsePlatform, type Platform } from '@/shared/kernel';
import { parseLoadedConfig, type LoadedConfig } from '@/features/config/domain/config-model';
import { visibleTabs, type ConfigTab } from '@/features/config/domain/config-tabs';
import type { ConfigPort } from './ports';

/** Everything the editor starts from: the host platform, the tabs it shows and the editable model. */
export interface ConfigSession extends LoadedConfig {
  platform: Platform;
  tabs: ConfigTab[];
}

/** `GET ./api/config` -> platform filter -> special options and defaults (legacy `created()`). */
export async function loadConfig(port: ConfigPort, signal?: AbortSignal): Promise<ConfigSession> {
  const dto = await port.load(signal);
  const platform = parsePlatform(dto['platform']);
  if (platform === null) {
    throw new AppError('parse', `Unsupported platform: ${String(dto['platform'])}`, { body: dto });
  }
  const tabs = visibleTabs(platform);
  return { platform, tabs, ...parseLoadedConfig(dto, platform, tabs) };
}

export const CONFIG_SESSION_QUERY_KEY = ['config', 'session'] as const;

/** Loads the configuration once per page view (no refetch: the editor owns the model after the first load). */
export function useConfigSession(port: ConfigPort): UseQueryResult<ConfigSession, AppError> {
  return useQuery<ConfigSession, AppError>({
    queryKey: CONFIG_SESSION_QUERY_KEY,
    queryFn: ({ signal }) => loadConfig(port, signal),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
