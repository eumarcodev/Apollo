import { useServerConfig } from '@/shared/infrastructure/server-config';
import type { Platform } from '@/shared/kernel';

/** Host platform from `GET /api/config`; null while loading or when the config cannot be read. */
export function usePlatform(): { platform: Platform | null; settled: boolean } {
  const config = useServerConfig();
  return { platform: config.data?.platform ?? null, settled: !config.isPending };
}
