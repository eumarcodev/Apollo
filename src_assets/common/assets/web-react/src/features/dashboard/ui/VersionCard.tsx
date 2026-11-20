import { Alert, Chip } from '@heroui/react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VersionNotice } from '@/features/dashboard/domain/version-status';
import type { VersionState } from '@/features/dashboard/application/use-version-status';
import { ExternalLink } from './ExternalLink';
import { SectionHeading } from './SectionHeading';

function Notice({ notice }: { notice: VersionNotice }) {
  const { t } = useTranslation();
  switch (notice.kind) {
    case 'dirty':
      return (
        <Alert status="success" data-testid="notice-dirty">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('index.version_dirty')} 🌇</Alert.Description>
          </Alert.Content>
        </Alert>
      );
    case 'pre-release':
      return (
        <Alert status="accent" data-testid="notice-pre-release">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('index.installed_version_not_stable')}</Alert.Description>
          </Alert.Content>
        </Alert>
      );
    case 'latest':
      return (
        <Alert status="success" data-testid="notice-latest">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('index.version_latest')}</Alert.Description>
          </Alert.Content>
        </Alert>
      );
    case 'update': {
      const release = notice.latest.release;
      return (
        <Alert status="warning" className="items-start" data-testid="notice-update">
          <Alert.Indicator />
          <Alert.Content className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Alert.Title>
                {notice.latest.channel === 'stable' ? t('index.new_stable') : t('index.new_pre_release')}
              </Alert.Title>
              {release?.html_url && (
                <ExternalLink
                  href={release.html_url}
                  variant="primary"
                  icon={<Download aria-hidden="true" className="size-4" />}
                  testId="download"
                >
                  {t('index.download')}
                </ExternalLink>
              )}
            </div>
            <Alert.Description className="flex flex-col gap-2">
              <h3 className="helios-display text-2xl lining-nums" data-testid="release-name">
                {release?.name}
              </h3>
              <pre
                className="helios-nav-scroll max-h-64 overflow-auto font-sans text-sm wrap-anywhere whitespace-pre-wrap"
                data-testid="release-body"
              >
                {release?.body}
              </pre>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      );
    }
  }
}

/** Installed version, update check result and the alerts that go with it. */
export function VersionCard({ state }: { state: VersionState }) {
  const { t } = useTranslation();
  const { installed, status, loading } = state;
  return (
    <section className="helios-panel flex flex-col gap-6 rounded-2xl p-6" data-testid="version-card">
      <SectionHeading title={installed ? t('index.version', { version: installed.version }) : '…'} />
      {installed && status && (
        <>
          {status.channelLabel && (
            <div>
              <Chip size="md" variant="soft" color="accent" data-testid="channel-badge">
                <Chip.Label>{status.channelLabel}</Chip.Label>
              </Chip>
            </div>
          )}
          {loading && (
            <p className="text-muted" data-testid="loading-latest">
              {t('index.loading_latest')}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {status.notices.map((notice) => (
              <Notice key={notice.kind} notice={notice} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
