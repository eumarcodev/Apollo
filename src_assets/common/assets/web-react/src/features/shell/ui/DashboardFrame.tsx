import { Button, Drawer } from '@heroui/react';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Brand } from './Brand';
import { SidebarContent } from './SidebarContent';

export interface DashboardFrameProps {
  /** Defaults to `window.location.pathname`; tests pass it explicitly. */
  pathname?: string;
  /** Optional content for the right side of the top bar (page actions). */
  topBar?: ReactNode;
  children: ReactNode;
}

/**
 * Frame of every authenticated page: sidebar on large screens, drawer opened from the top bar on small ones,
 * and a content area that scrolls on its own.
 */
export function DashboardFrame({ pathname = window.location.pathname, topBar, children }: DashboardFrameProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="flex h-screen bg-background text-foreground" data-testid="dashboard-frame">
      <aside className="hidden w-64 shrink-0 border-r border-separator bg-surface lg:block" data-testid="sidebar">
        <SidebarContent pathname={pathname} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-surface px-4"
          data-testid="top-bar"
        >
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-label={t('navbar.toggle_navigation')}
            aria-expanded={drawerOpen}
            data-testid="menu-button"
            onPress={() => setDrawerOpen(true)}
          >
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">{topBar}</div>
        </header>
        <main className="flex-1 overflow-y-auto" data-layout="shell">
          {children}
        </main>
      </div>
      <Drawer.Backdrop isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog data-testid="drawer" aria-label={t('navbar.toggle_navigation')}>
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading className="sr-only">{t('navbar.toggle_navigation')}</Drawer.Heading>
              <Brand />
              <Drawer.CloseTrigger aria-label={t('navbar.close_navigation')} data-testid="drawer-close">
                <X aria-hidden="true" className="size-5" />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body className="p-0">
              <SidebarContent pathname={pathname} showBrand={false} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
