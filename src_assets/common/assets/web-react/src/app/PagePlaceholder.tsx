import { Card } from '@heroui/react';
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
      <Card data-testid="page-placeholder" data-page={page}>
        <Card.Header>
          <Construction aria-hidden="true" className="size-6 text-warning" />
          <Card.Description>{t('react_ui.page_placeholder')}</Card.Description>
        </Card.Header>
      </Card>
    </PageLayout>
  );
}
