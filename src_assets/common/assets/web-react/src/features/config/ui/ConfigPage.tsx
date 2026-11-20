import { Alert, Button, Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useConfigSession } from '@/features/config/application/load-config';
import type { ConfigPort, PageEnvironment } from '@/features/config/application/ports';
import { PageLayout } from '@/shared/ui';
import { ConfigEditorView } from './ConfigEditorView';

export interface ConfigPageProps {
  port: ConfigPort;
  env: PageEnvironment;
}

/** Configuration page: loads `GET /api/config` once, then hands the model to the editor. */
export function ConfigPage({ port, env }: ConfigPageProps) {
  const { t } = useTranslation();
  const session = useConfigSession(port);
  return (
    <PageLayout title={t('config.configuration')}>
      {session.isPending && (
        <div className="flex justify-center py-16" data-testid="config-loading">
          <Spinner size="lg" aria-label={t('config.configuration')} />
        </div>
      )}
      {session.isError && (
        <Alert status="danger" data-testid="config-load-error">
          <Alert.Indicator />
          <Alert.Content className="gap-3">
            <Alert.Title>{t('react_ui.config_load_error')}</Alert.Title>
            <Alert.Description>{session.error.message}</Alert.Description>
            <div>
              <Button size="sm" variant="danger" onPress={() => void session.refetch()}>
                {t('react_ui.reload')}
              </Button>
            </div>
          </Alert.Content>
        </Alert>
      )}
      {session.isSuccess && <ConfigEditorView session={session.data} port={port} env={env} />}
    </PageLayout>
  );
}
