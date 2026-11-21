import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/shared/ui';
import { PairingSection, type PairingSectionProps } from './PairingSection';

/** PIN page with the pairing section (the paired-device list joins it in the clients slice). */
export function PairingPage(props: PairingSectionProps) {
  const { t } = useTranslation();
  return (
    <PageLayout title={t('navbar.pin')} description={t('pin.pairing_desc')}>
      <PairingSection {...props} />
    </PageLayout>
  );
}
