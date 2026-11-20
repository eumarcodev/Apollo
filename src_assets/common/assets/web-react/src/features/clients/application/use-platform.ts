import { useServerConfig } from '@/shared/infrastructure/server-config';
import type { Platform } from '@/shared/kernel';

/** Host platform from `GET /api/config`; null while loading or when the config cannot be read. */
export function useClientsPlatform(): Platform | null {
  const config = useServerConfig();
  return config.data?.platform ?? null;
}
