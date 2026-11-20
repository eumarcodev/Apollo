import { Link } from '@heroui/react';
import { useTranslation } from 'react-i18next';

/** Helios logo with name and tagline; links to the home page. `compact` shows only the logo. */
export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link href="./" data-testid="brand" className="flex min-w-0 items-center gap-3 no-underline">
      <span className="helios-logo-tile grid size-11 shrink-0 place-items-center rounded-xl">
        <img src="/images/logo-helios-45.png" alt="Helios" title="Helios" height={45} width={45} className="size-9" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight text-foreground">Helios</span>
          <span className="truncate text-[11px] font-medium tracking-wide text-muted">{t('navbar.brand_tagline')}</span>
        </span>
      )}
    </Link>
  );
}
