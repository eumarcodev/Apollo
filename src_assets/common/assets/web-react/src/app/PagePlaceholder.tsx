import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/shared/ui';

export interface PagePlaceholderProps {
  /** Page name (HTML entry), used by the smoke tests. */
  page: string;
  /** Translation key of the page title. */
  titleKey: string;
}

/**
 * Temporary page body until the slice of the page is migrated: the title in display serif with the migration note on
 * the left, the Helios emblem on the right (stacked when the container is narrow, as in the public layout).
 */
export function PagePlaceholder({ page, titleKey }: PagePlaceholderProps) {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <div
        className="helios-panel helios-hero @container rounded-2xl px-6 py-12 sm:px-12"
        data-testid="page-placeholder"
        data-page={page}
      >
        <div className="grid items-center gap-10 @3xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex max-w-xl flex-col gap-6">
            <h1 className="helios-display text-5xl @3xl:text-6xl">{t(titleKey)}</h1>
            <div aria-hidden="true" className="helios-ornament max-w-xs">
              <span className="helios-diamond" />
            </div>
            <p className="text-base leading-relaxed text-muted">{t('react_ui.page_placeholder')}</p>
          </div>
          <div aria-hidden="true" className="helios-emblem mx-auto size-56 @3xl:size-72">
            <span className="helios-emblem-rays" />
            <img src="/images/logo-helios.svg" alt="" className="relative size-[58%]" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
