import { Alert } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { isVdisplayWarning, vdisplayStatusName } from '@/features/config/domain/av-options';
import type { VdisplayStatus } from '@/features/config/domain/config-model';

/** Virtual display driver (SudoVDA) status; Windows only. Warning for any truthy status, as the legacy page. */
export function VdisplayStatusAlert({ status }: { status: VdisplayStatus }) {
  const { t } = useTranslation();
  const name = vdisplayStatusName(status);
  const warning = isVdisplayWarning(status);

  return (
    <Alert
      status={warning ? 'warning' : 'success'}
      data-testid="vdisplay-status"
      data-state={warning ? 'warning' : 'ok'}
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {t('react_ui.vdisplay_status', { status: name === null ? '' : t(`react_ui.vdisplay_status_${name}`) })}
        </Alert.Title>
        {warning && <Alert.Description>{t('react_ui.vdisplay_hint')}</Alert.Description>}
      </Alert.Content>
    </Alert>
  );
}
