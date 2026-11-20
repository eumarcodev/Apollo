import { Alert, Button } from '@heroui/react';
import { ArrowDownAZ, ArrowLeft, FileDown, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppsBrowser, AppsPort } from '@/features/apps/application/ports';
import { useApps } from '@/features/apps/application/use-apps';
import { editDraft, newAppDraft, type AppEntry } from '@/features/apps/domain/app-entry';
import { isLocalHostname } from '@/features/apps/domain/app-list';
import { buildLaunchLink, launcherDownload } from '@/features/apps/domain/launcher';
import { notify, PageLayout, useConfirm } from '@/shared/ui';
import { AppsTable } from './AppsTable';

export interface AppsPageProps {
  port: AppsPort;
  browser: AppsBrowser;
}

/** Applications page: the list with reorder, launch, close, delete and export; the editor opens in place. */
export function AppsPage({ port, browser }: AppsPageProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const apps = useApps(port);
  const [editing, setEditing] = useState<AppEntry | null>(null);
  const host = { hostUuid: apps.hostUuid, hostName: apps.hostName };

  const exportApp = (app: AppEntry) => browser.download(launcherDownload(host, app));

  async function launch(app: AppEntry) {
    if (!isLocalHostname(browser.hostname)) {
      const local = await confirm({
        title: t('apps.launch'),
        body: t('apps.launch_local_client'),
        confirmLabel: t('apps.launch'),
      });
      if (local) {
        browser.openLink(buildLaunchLink(host, app));
        return;
      }
    }
    const accepted = await confirm({
      title: t('apps.launch'),
      body: t('apps.launch_warning'),
      confirmLabel: t('apps.launch'),
    });
    if (!accepted) {
      return;
    }
    const result = await apps.launch(app.uuid);
    if (!result.status) {
      notify.error(`${t('apps.launch_failed')}${result.error ?? ''}`);
    }
  }

  async function closeCurrent() {
    const accepted = await confirm({
      title: t('apps.close'),
      body: t('apps.close_warning'),
      confirmLabel: t('apps.close'),
    });
    if (accepted && !(await apps.close()).status) {
      notify.error(t('apps.close_failed'));
    }
  }

  async function remove(app: AppEntry) {
    const accepted = await confirm({
      title: t('apps.delete'),
      body: t('apps.delete_confirm', { name: app.name }),
      confirmLabel: t('apps.delete'),
      status: 'danger',
    });
    if (!accepted) {
      return;
    }
    const result = await apps.remove(app.uuid);
    if (!result.status) {
      notify.error(`${t('apps.delete_failed')}${result.error ?? ''}`);
    }
  }

  async function saveOrder() {
    const result = await apps.saveOrder();
    if (!result.status) {
      notify.error(`${t('apps.reorder_failed')}${result.error ?? ''}`);
    }
  }

  if (editing) {
    return (
      <PageLayout
        title={editing.name || t('apps.no_name')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" data-testid="editor-cancel" onPress={() => setEditing(null)}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t('_common.cancel')}
            </Button>
            <Button
              variant="outline"
              data-testid="editor-export"
              isDisabled={!editing.uuid}
              onPress={() => exportApp(editing)}
            >
              <FileDown aria-hidden="true" className="size-4" />
              {t('apps.export_launcher_file')}
            </Button>
          </div>
        }
      >
        <section className="helios-panel rounded-2xl p-6 text-muted" data-testid="editor-pending">
          {t('apps.editor_pending')}
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t('apps.applications_title')}
      description={
        <span className="flex flex-col gap-1">
          <span>{t('apps.applications_desc')}</span>
          <span>{t('apps.applications_reorder_desc')}</span>
          <span className="whitespace-pre-wrap" data-testid="apps-tips">
            {t('apps.applications_tips')}
          </span>
        </span>
      }
    >
      {apps.error && (
        <Alert status="danger" data-testid="apps-error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{`${t('apps.load_failed')}${apps.error.message}`}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <section className="helios-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-6" data-testid="apps-panel">
        <AppsTable
          apps={apps.apps}
          host={host}
          currentApp={apps.currentApp}
          busy={apps.busy}
          onMove={apps.move}
          onEdit={(app) => setEditing(editDraft(app))}
          onDelete={(app) => void remove(app)}
          onClose={() => void closeCurrent()}
          onLaunch={(app) => void launch(app)}
          onExport={exportApp}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="primary"
            data-testid="add-app"
            isDisabled={apps.busy}
            onPress={() => setEditing(newAppDraft())}
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('apps.add_new')}
          </Button>
          {apps.reordered ? (
            <Button variant="primary" data-testid="save-order" isDisabled={apps.busy} onPress={() => void saveOrder()}>
              <Save aria-hidden="true" className="size-4" />
              {t('apps.save_order')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              data-testid="alphabetize-apps"
              isDisabled={apps.busy}
              onPress={() => {
                if (!apps.alphabetize()) {
                  notify.info(t('apps.already_ordered'));
                }
              }}
            >
              <ArrowDownAZ aria-hidden="true" className="size-4" />
              {t('apps.alphabetize')}
            </Button>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
