import { Alert, Link, Table } from '@heroui/react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_ENV_VARS, APP_EXAMPLES_URL, envExample } from '@/features/apps/domain/env-vars';
import type { Platform } from '@/shared/kernel';

export interface EnvVarsReferenceProps {
  platform: Platform | null;
}

/** Read-only reference of the environment variables app commands receive, with the platform example. */
export function EnvVarsReference({ platform }: EnvVarsReferenceProps) {
  const { t } = useTranslation();
  const example = envExample(platform);
  return (
    <div className="flex flex-col gap-4" data-testid="env-vars">
      <div className="flex flex-col gap-1">
        <h3 className="helios-display text-2xl">{t('apps.env_vars_about')}</h3>
        <p className="text-sm text-muted">{t('apps.env_vars_desc')}</p>
      </div>
      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label={t('apps.env_vars_about')} data-testid="env-vars-table">
            <Table.Header>
              <Table.Column id="name" isRowHeader>
                {t('apps.env_var_name')}
              </Table.Column>
              <Table.Column id="desc" />
            </Table.Header>
            <Table.Body items={APP_ENV_VARS.map((envVar) => ({ id: envVar.name, ...envVar }))}>
              {(envVar) => (
                <Table.Row id={envVar.name}>
                  <Table.Cell>
                    <code className="font-mono text-sm">{envVar.name}</code>
                  </Table.Cell>
                  <Table.Cell>{t(envVar.descKey)}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {example && (
        <div className="flex flex-col gap-2" data-testid="env-example">
          <p className="text-sm font-semibold">{t(example.labelKey)}</p>
          <pre className="overflow-x-auto rounded-xl bg-surface-secondary p-3 font-mono text-sm">{example.command}</pre>
        </div>
      )}
      <Link
        href={APP_EXAMPLES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start"
        data-testid="env-see-more"
      >
        {t('_common.see_more')}
        <ExternalLink aria-hidden="true" className="ms-1 size-4" />
      </Link>
      <Alert status="accent" data-testid="env_client_fps_float">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{t('apps.env_client_fps_float')}</Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}
