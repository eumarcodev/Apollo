import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConfigTabId } from '@/features/config/domain/config-tabs';

/** Body of a tab whose fields are not migrated yet (replaced through `TAB_COMPONENTS`). */
export function ConfigTabPlaceholder({ tabId }: { tabId: ConfigTabId }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-dashed border-border px-5 py-6 text-muted"
      data-testid="config-tab-placeholder"
      data-tab={tabId}
    >
      <Construction aria-hidden="true" className="size-6 shrink-0 text-accent" />
      <p>{t('react_ui.config_tab_placeholder')}</p>
    </div>
  );
}
