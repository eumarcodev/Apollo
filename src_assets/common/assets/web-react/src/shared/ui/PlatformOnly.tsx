import type { ReactNode } from 'react';
import type { Platform } from '@/shared/kernel';

export interface PlatformOnlyProps {
  /** Host platform from `GET /api/config`. */
  platform: Platform | null | undefined;
  /** Platforms on which the children are rendered. */
  platforms: readonly Platform[];
  children?: ReactNode;
}

/** Render children only on the given platforms (replaces the legacy PlatformLayout.vue slots). */
export function PlatformOnly({ platform, platforms, children }: PlatformOnlyProps) {
  if (!platform || !platforms.includes(platform)) {
    return null;
  }
  return <>{children}</>;
}
