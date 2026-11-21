import { Tabs } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { ConfigSession } from '@/features/config/application/load-config';
import type { ConfigPort, PageEnvironment } from '@/features/config/application/ports';
import { useConfigEditor } from '@/features/config/application/use-config-editor';
import type { ConfigTabId } from '@/features/config/domain/config-tabs';
import { SaveBar } from './SaveBar';
import { ConfigTabPlaceholder } from './tabs/ConfigTabPlaceholder';
import { TAB_COMPONENTS } from './tabs/registry';
import { useHashNavigation } from './use-hash-navigation';

export interface ConfigEditorViewProps {
  session: ConfigSession;
  port: ConfigPort;
  env: PageEnvironment;
}

/** Tabs of the shown platform, the selected tab body and the save bar. */
export function ConfigEditorView({ session, port, env }: ConfigEditorViewProps) {
  const { t } = useTranslation();
  const editor = useConfigEditor(session, port, env);
  const { selectedTab, selectTab } = useHashNavigation(session.tabs);

  return (
    <>
      <Tabs
        orientation="vertical"
        selectedKey={selectedTab}
        onSelectionChange={(key) => selectTab(key as ConfigTabId)}
        className="items-start gap-6 max-lg:flex-col max-lg:items-stretch"
        data-testid="config-tabs"
      >
        <Tabs.List
          aria-label={t('config.configuration')}
          className="helios-panel w-full shrink-0 rounded-2xl p-2 lg:sticky lg:top-6 lg:w-72 max-lg:flex-row max-lg:overflow-x-auto"
        >
          {session.tabs.map((tab) => (
            <Tabs.Tab
              key={tab.id}
              id={tab.id}
              className="h-auto min-h-10 justify-start rounded-xl px-4 py-2 text-left whitespace-nowrap lg:whitespace-normal"
              data-testid={`config-tab-${tab.id}`}
            >
              {t(tab.nameKey)}
              <Tabs.Indicator className="rounded-xl" />
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {session.tabs.map((tab) => {
          const TabComponent = TAB_COMPONENTS[tab.id];
          return (
            <Tabs.Panel
              key={tab.id}
              id={tab.id}
              className="helios-panel flex w-full min-w-0 flex-col gap-6 rounded-2xl p-6 sm:p-8"
              data-testid={`config-panel-${tab.id}`}
            >
              <h2 className="helios-display text-3xl lining-nums">{t(tab.nameKey)}</h2>
              {TabComponent ? (
                <TabComponent
                  config={editor.config}
                  platform={session.platform}
                  update={editor.update}
                  vdisplayStatus={session.vdisplayStatus}
                />
              ) : (
                <ConfigTabPlaceholder tabId={tab.id} />
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>
      <SaveBar editor={editor} />
    </>
  );
}
