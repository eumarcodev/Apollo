import { useServerConfig } from '@/shared/infrastructure/server-config';
import type { Platform } from '@/shared/kernel';

/**
 * Host platform from `GET /api/config`; null while loading or when the config cannot be read (the legacy editor
 * then showed no platform-specific field, which the editor keeps).
 */
export function useHostPlatform(): Platform | null {
  return useServerConfig().data?.platform ?? null;
}
