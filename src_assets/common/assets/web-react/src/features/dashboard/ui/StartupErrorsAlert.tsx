import { Alert, buttonVariants } from '@heroui/react';
import { Trans, useTranslation } from 'react-i18next';
import type { LogEntry } from '@/features/dashboard/domain/startup-log';

export interface StartupErrorsAlertProps {
  errors: readonly LogEntry[];
}

/** Fatal errors the host logged at startup. Log text is rendered as text, never as HTML. */
export function StartupErrorsAlert({ errors }: StartupErrorsAlertProps) {
  const { t } = useTranslation();
  if (errors.length === 0) {
    return null;
  }
  return (
    <Alert status="danger" data-testid="startup-errors">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description className="flex flex-col gap-3">
          <p>
            <Trans i18nKey="index.startup_errors" t={t} components={{ b: <b /> }} />
          </p>
          <ul className="list-disc pl-5 whitespace-pre-wrap" data-testid="startup-error-list">
            {errors.map((entry) => (
              <li key={`${entry.timestamp}${entry.value}`}>{entry.value}</li>
            ))}
          </ul>
          <a
            href="./troubleshooting#logs"
            className={`${buttonVariants({ variant: 'danger', size: 'md' })} self-start`}
            data-testid="view-logs"
          >
            {t('index.view_logs')}
          </a>
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
