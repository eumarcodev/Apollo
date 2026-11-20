import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Platform } from '@/shared/kernel';

/**
 * Key counterpart of `tp()`: `<key>_<platform>` when it exists, else `<key>_unix` on Linux and macOS.
 * The shared `TextField` takes translation keys, so the platform text is resolved to a key here.
 */
export function usePlatformKey(platform: Platform): (key: string) => string {
  const { i18n } = useTranslation();
  return useMemo(
    () => (key) => {
      const platformKey = `${key}_${platform}`;
      if (i18n.exists(platformKey) || platform === 'windows') {
        return platformKey;
      }
      return `${key}_unix`;
    },
    [i18n, platform],
  );
}

/** Monospace block for a command or an example output. */
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-default px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

/** Link to an outside page, opened in a new tab. */
export function OutsideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
      {children}
    </a>
  );
}

/** A titled group of fields of the tab. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby={`${id}-title`} data-testid={id}>
      <h3 id={`${id}-title`} className="helios-eyebrow">
        {title}
      </h3>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
