import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/shared/ui';
import type { HostLogPort, ReleasesPort } from '@/features/dashboard/application/ports';
import { useStartupErrors } from '@/features/dashboard/application/use-startup-errors';
import { useVersionStatus } from '@/features/dashboard/application/use-version-status';
import { ClientsCard } from './ClientsCard';
import { ResourceCard } from './ResourceCard';
import { StartupErrorsAlert } from './StartupErrorsAlert';
import { VersionCard } from './VersionCard';

export interface DashboardPageProps {
  releases: ReleasesPort;
  log: HostLogPort;
}

/** Home page: version and update status, fatal startup errors, clients, resources and legal links. */
export function DashboardPage({ releases, log }: DashboardPageProps) {
  const { t } = useTranslation();
  const version = useVersionStatus(releases);
  const startupErrors = useStartupErrors(log);
  return (
    <PageLayout title={t('index.welcome')} description={t('index.description')}>
      <StartupErrorsAlert errors={startupErrors} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <VersionCard state={version} />
        <ClientsCard />
      </div>
      <ResourceCard />
    </PageLayout>
  );
}
