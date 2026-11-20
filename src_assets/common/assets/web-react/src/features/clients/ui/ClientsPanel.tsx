import { Alert, Button } from '@heroui/react';
import { UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { useClients } from '@/features/clients/application/use-clients';
import { useClientsPlatform } from '@/features/clients/application/use-platform';
import { useConfirm } from '@/shared/ui';
import { ClientEditor } from './ClientEditor';
import { ClientRow } from './ClientRow';
import { LearnMore } from './LearnMore';
import { DOCS_URL } from './links';

export type ClientsController = ReturnType<typeof useClients>;

export interface ClientsPanelProps {
  controller: ClientsController;
}

/** Device management card of the PIN page: the paired devices with their editor, and "unpair all". */
export function ClientsPanel({ controller }: ClientsPanelProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const platform = useClientsPlatform();
  const { clients, editing } = controller;

  const unpairAll = async () => {
    const accepted = await confirm({
      title: t('pin.unpair_all_confirm_title'),
      body: t('pin.unpair_all_confirm_body'),
      confirmLabel: t('pin.unpair_all'),
      status: 'danger',
    });
    if (accepted) {
      await controller.unpairAll();
    }
  };

  return (
    <section className="helios-panel flex flex-col gap-6 rounded-2xl p-6" data-testid="clients-card">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="helios-display text-3xl lining-nums" id="unpair">
            {t('pin.device_management')}
          </h2>
          <p className="text-muted">{t('pin.device_management_desc')}</p>
          <p className="text-muted">
            {t('pin.device_management_warning')} <LearnMore href={DOCS_URL} testId="permissions-docs" />
          </p>
        </div>
        <Button
          variant="danger"
          isDisabled={controller.unpairAllPending}
          data-testid="unpair-all"
          onPress={() => void unpairAll()}
        >
          <UserMinus aria-hidden="true" className="size-4" />
          {t('pin.unpair_all')}
        </Button>
      </header>

      {controller.unpairNotice && (
        <Alert status="success" data-testid="unpair-notice">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('_common.success')}</Alert.Title>
            <Alert.Description>{t('pin.unpair_single_success')}</Alert.Description>
          </Alert.Content>
          <Button
            size="sm"
            variant="secondary"
            data-testid="unpair-notice-dismiss"
            onPress={controller.dismissUnpairNotice}
          >
            {t('_common.dismiss')}
          </Button>
        </Alert>
      )}
      {controller.unpairAllStatus !== null && (
        <Alert
          status={controller.unpairAllStatus ? 'success' : 'danger'}
          data-testid="unpair-all-status"
          data-status={controller.unpairAllStatus ? 'success' : 'error'}
          role="alert"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t(controller.unpairAllStatus ? 'pin.unpair_all_success' : 'pin.unpair_all_error')}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {controller.saveError !== null && (
        <Alert status="danger" data-testid="save-error" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t('pin.save_client_error')}
              {controller.saveError}
            </Alert.Description>
          </Alert.Content>
          <Button size="sm" variant="secondary" data-testid="save-error-dismiss" onPress={controller.dismissSaveError}>
            {t('_common.dismiss')}
          </Button>
        </Alert>
      )}

      {clients !== null && clients.length > 0 ? (
        <ul className="flex flex-col gap-3" data-testid="client-list">
          {clients.map((client) =>
            editing?.uuid === client.uuid ? (
              <ClientEditor
                key={client.uuid}
                draft={editing.draft}
                platform={platform}
                onChange={controller.updateDraft}
                onSave={() => void controller.save()}
                onCancel={controller.cancelEdit}
              />
            ) : (
              <ClientRow
                key={client.uuid}
                client={client}
                onDisconnect={(uuid) => void controller.disconnect(uuid)}
                onEdit={controller.startEdit}
                onUnpair={(uuid) => void controller.unpair(uuid)}
              />
            ),
          )}
        </ul>
      ) : (
        clients !== null && (
          <p
            className="rounded-xl border border-separator px-4 py-6 text-center text-muted italic"
            data-testid="clients-empty"
          >
            {t('pin.unpair_single_no_devices')}
          </p>
        )
      )}
    </section>
  );
}
