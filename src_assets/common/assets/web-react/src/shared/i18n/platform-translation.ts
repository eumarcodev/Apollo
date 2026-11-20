import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Platform } from '@/shared/kernel';

export interface TranslatorLike {
  t(key: string): string;
  exists(key: string): boolean;
}

export type PlatformTranslate = (key: string, defaultMsg?: string) => string;

/**
 * Platform-aware translation, ported from the legacy platform-i18n.js:
 * try `<key>_<platform>`; on Windows a missing key returns `defaultMsg` or the platform key itself;
 * on Linux and macOS fall back to `<key>_unix`, then `defaultMsg`, then the unix key.
 */
export function createPlatformTranslator(i18n: TranslatorLike, platform: Platform): PlatformTranslate {
  return (key, defaultMsg) => {
    const platformKey = `${key}_${platform}`;
    if (i18n.exists(platformKey)) {
      return i18n.t(platformKey);
    }
    if (platform === 'windows') {
      return defaultMsg ? defaultMsg : platformKey;
    }
    const unixKey = `${key}_unix`;
    if (i18n.exists(unixKey)) {
      return i18n.t(unixKey);
    }
    return defaultMsg ? defaultMsg : unixKey;
  };
}

/** `tp(key, defaultMsg?)` bound to the current i18n instance and the host platform. */
export function usePlatformTranslation(platform: Platform): PlatformTranslate {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => createPlatformTranslator({ t: (key) => t(key), exists: (key) => i18n.exists(key) }, platform),
    [t, i18n, platform],
  );
}
