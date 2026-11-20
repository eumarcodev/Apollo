import { Button, Drawer } from '@heroui/react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { findActiveNavItem, NAV_ITEMS } from '@/features/shell/domain/navigation';
import { Brand } from './Brand';
import { NAV_ICONS, SidebarContent } from './SidebarContent';
import { useSidebarCollapsed } from './use-sidebar-collapsed';

export interface DashboardFrameProps {
  /** Defaults to `window.location.pathname`; tests pass it explicitly. */
  pathname?: string;
  /** Optional content for the right side of the top bar (page actions). */
  topBar?: ReactNode;
  children: ReactNode;
}

/** Breadcrumb of the top bar: the current page under the Helios root. */
function CurrentPage({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const active = findActiveNavItem(pathname);
  const item = NAV_ITEMS.find((entry) => entry.id === active);
  if (!item) {
    return null;
  }
  const Icon = NAV_ICONS[item.id];
  return (
    <div className="hidden min-w-0 items-center gap-3 lg:flex" data-testid="current-page">
      <span className="helios-icon-tile grid size-10 shrink-0 place-items-center rounded-xl">
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="text-muted">Helios</span>
        <ChevronRight aria-hidden="true" className="size-4 text-muted" />
        <span className="truncate font-semibold text-foreground">{t(item.labelKey)}</span>
      </div>
    </div>
  );
}

/**
 * Frame of every authenticated page: floating glass sidebar on large screens, drawer opened from the top bar on small
 * ones, and a content area that scrolls on its own.
 */
export function DashboardFrame({ pathname = window.location.pathname, topBar, children }: DashboardFrameProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  return (
    <div
      className="helios-backdrop flex h-screen gap-5 p-3 text-foreground sm:p-4 lg:p-5"
      data-testid="dashboard-frame"
    >
      <aside
        className={[
          'helios-panel hidden shrink-0 rounded-3xl lg:block',
          'transition-[width] duration-300 ease-out',
          collapsed ? 'w-[84px]' : 'w-[272px]',
        ].join(' ')}
        data-testid="sidebar"
        data-collapsed={collapsed}
      >
        <SidebarContent pathname={pathname} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header
          className={['helios-topbar flex h-16 shrink-0 items-center gap-3 rounded-2xl px-3 lg:px-1'].join(' ')}
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
          <CurrentPage pathname={pathname} />
          <div className="ml-auto flex items-center gap-2">{topBar}</div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto rounded-3xl" data-layout="shell">
          {children}
        </main>
      </div>
      <Drawer.Backdrop isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog data-testid="drawer" aria-label={t('navbar.toggle_navigation')} className="helios-drawer">
            <Drawer.Header className="flex items-center justify-between px-5 pt-5">
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
