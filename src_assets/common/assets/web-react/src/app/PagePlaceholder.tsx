import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/shared/ui';

export interface PagePlaceholderProps {
  /** Page name (HTML entry), used by the smoke tests. */
  page: string;
  /** Translation key of the page title. */
  titleKey: string;
}

/** Temporary page body until the slice of the page is migrated. */
export function PagePlaceholder({ page, titleKey }: PagePlaceholderProps) {
  const { t } = useTranslation();
  return (
    <PageLayout title={t(titleKey)}>
      <div
        className="helios-panel helios-hero relative flex min-h-[340px] flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl px-6 py-14 text-center"
        data-testid="page-placeholder"
        data-page={page}
      >
        <span className="helios-icon-tile grid size-16 place-items-center rounded-2xl">
          <Construction aria-hidden="true" className="size-7" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <p className="text-lg font-semibold text-foreground">{t(titleKey)}</p>
          <p className="text-sm text-muted">{t('react_ui.page_placeholder')}</p>
        </div>
      </div>
    </PageLayout>
  );
}
