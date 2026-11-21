import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClientsPort } from '@/features/clients/application/ports';
import { useClients } from '@/features/clients/application/use-clients';
import { PageLayout } from '@/shared/ui';
import { ClientsPanel } from './ClientsPanel';

export interface PinPageProps {
  port: ClientsPort;
  /** Pairing forms; `onPaired` refreshes the device list. Supplied by the slice entry (the pairing slice). */
  renderPairing: (onPaired: () => void) => ReactNode;
  /** What to do when the list cannot be read; defaults to reloading the page. */
  reload?: () => void;
}

/** The PIN page: pairing forms with the paired devices below them. */
export function PinPage({ port, renderPairing, reload }: PinPageProps) {
  const { t } = useTranslation();
  const controller = useClients({ port, ...(reload ? { reload } : {}) });
  const { refresh } = controller;
  return (
    <PageLayout title={t('navbar.pin')} description={t('pin.pairing_desc')}>
      {renderPairing(() => void refresh())}
      <ClientsPanel controller={controller} />
    </PageLayout>
  );
}
