import { MonitorCog, OctagonX, Power, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaintenance, type MaintenanceOptions } from '@/features/troubleshooting/application/use-maintenance';
import { usePlatform } from '@/features/troubleshooting/application/use-platform';
import type { LogsPort, MaintenancePort } from '@/features/troubleshooting/application/ports';
import { notify, PageLayout, PlatformOnly, useConfirm } from '@/shared/ui';
import { ActionCard } from './ActionCard';
import { LogsCard } from './LogsCard';

export interface TroubleshootingPageProps extends MaintenanceOptions {
  maintenance: MaintenancePort;
  logs: LogsPort;
  /** Polling interval of the log in milliseconds (default 5 s). */
  logPollIntervalMs?: number;
}

const ICON = 'size-7';

/** Scroll to the card named by the URL hash (`#logs`): the cards only exist once the page has rendered. */
function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) {
      return;
    }
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) {
      document.getElementById(id)?.scrollIntoView();
    }
  }, [ready]);
}

/** Maintenance actions (force close, restart, quit, display reset) and the live host log. */
export function TroubleshootingPage({ maintenance: port, logs, logPollIntervalMs, reload }: TroubleshootingPageProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { platform, settled } = usePlatform();
  const maintenance = useMaintenance(port, reload ? { reload } : {});
  useScrollToHash(settled);

  const quit = async () => {
    const accepted = await confirm({
      title: t('troubleshooting.quit_helios'),
      body: t('troubleshooting.quit_helios_confirm'),
      confirmLabel: t('troubleshooting.quit_helios'),
      status: 'danger',
    });
    if (accepted && !(await maintenance.quit())) {
      notify.error(t('troubleshooting.exit_failed'));
    }
  };

  const outcome = (status: boolean | null, success: string, error: string) =>
    status === null
      ? null
      : { status: status ? ('success' as const) : ('danger' as const), text: t(status ? success : error) };

  const quitNotice =
    maintenance.quitState === 'quitting'
      ? { status: 'success' as const, text: t('troubleshooting.quit_helios_success_ongoing') }
      : maintenance.quitState === 'quit'
        ? { status: 'success' as const, text: t('troubleshooting.quit_helios_success') }
        : null;

  return (
    <PageLayout title={t('troubleshooting.troubleshooting')}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
        <ActionCard
          id="close_apps"
          icon={<OctagonX className={ICON} />}
          title={t('troubleshooting.force_close')}
          description={t('troubleshooting.force_close_desc')}
          notice={outcome(
            maintenance.closeAppStatus,
            'troubleshooting.force_close_success',
            'troubleshooting.force_close_error',
          )}
          buttonLabel={t('troubleshooting.force_close')}
          isDisabled={maintenance.closeAppPressed}
          onPress={() => void maintenance.closeApps()}
        />
        <ActionCard
          id="restart"
          icon={<RotateCw className={ICON} />}
          title={t('troubleshooting.restart_helios')}
          description={t('troubleshooting.restart_helios_desc')}
          notice={
            maintenance.restarting ? { status: 'success', text: t('troubleshooting.restart_helios_success') } : null
          }
          buttonLabel={t('troubleshooting.restart_helios')}
          isDisabled={maintenance.busy}
          onPress={() => void maintenance.restart()}
        />
        <ActionCard
          id="quit"
          icon={<Power className={ICON} />}
          title={t('troubleshooting.quit_helios')}
          description={t('troubleshooting.quit_helios_desc')}
          notice={quitNotice}
          buttonLabel={t('troubleshooting.quit_helios')}
          buttonVariant="danger"
          isDisabled={maintenance.busy}
          onPress={() => void quit()}
        />
        <PlatformOnly platform={platform} platforms={['windows']}>
          <ActionCard
            id="dd_reset"
            icon={<MonitorCog className={ICON} />}
            title={t('troubleshooting.dd_reset')}
            description={t('troubleshooting.dd_reset_desc')}
            preLine
            notice={outcome(
              maintenance.ddResetStatus,
              'troubleshooting.dd_reset_success',
              'troubleshooting.dd_reset_error',
            )}
            buttonLabel={t('troubleshooting.dd_reset')}
            isDisabled={maintenance.ddResetPressed}
            onPress={() => void maintenance.resetDisplay()}
          />
        </PlatformOnly>
      </div>
      <LogsCard port={logs} {...(logPollIntervalMs === undefined ? {} : { pollIntervalMs: logPollIntervalMs })} />
    </PageLayout>
  );
}
