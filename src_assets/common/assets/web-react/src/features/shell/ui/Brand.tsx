import { Link } from '@heroui/react';
import { useTranslation } from 'react-i18next';

/** Helios logo with the name in gold serif capitals and the tagline; links to the home page. `compact`: logo only. */
export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link href="./" data-testid="brand" className="flex min-w-0 items-center gap-3 no-underline">
      <span className="helios-logo-tile grid size-11 shrink-0 place-items-center rounded-full">
        <img src="/images/logo-helios-45.png" alt="Helios" title="Helios" height={45} width={45} className="size-9" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="helios-display helios-gold-text text-[22px] leading-none tracking-[0.24em] uppercase">
            Helios
          </span>
          <span className="text-[9px] leading-snug font-semibold tracking-[0.14em] text-muted uppercase">
            {t('navbar.brand_tagline')}
          </span>
        </span>
      )}
    </Link>
  );
}
