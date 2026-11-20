import { Button, Link } from '@heroui/react';
import {
  House,
  Info,
  Layers,
  LockOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldUser,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { findActiveNavItem, NAV_ITEMS, type NavItemId } from '@/features/shell/domain/navigation';
import { Brand } from './Brand';
import { Hint } from './Hint';
import { ThemeSwitcher } from './ThemeSwitcher';

const ICONS: Record<NavItemId, LucideIcon> = {
  home: House,
  pin: LockOpen,
  applications: Layers,
  configuration: Settings,
  password: ShieldUser,
  troubleshooting: Info,
};

export interface SidebarContentProps {
  /** `location.pathname` of the page; decides the highlighted item. */
  pathname: string;
  /** Hide the brand (the drawer shows it in its own header). */
  showBrand?: boolean;
  /** Icons only (desktop sidebar). */
  collapsed?: boolean;
  /** When given, shows the collapse/expand button. */
  onToggleCollapsed?: () => void;
}

/** Brand, navigation and theme switcher: the content of the desktop sidebar and of the mobile drawer. */
export function SidebarContent({
  pathname,
  showBrand = true,
  collapsed = false,
  onToggleCollapsed,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const active = findActiveNavItem(pathname);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = t(collapsed ? 'navbar.expand_sidebar' : 'navbar.collapse_sidebar');
  return (
    <div className={['flex h-full flex-col gap-4 py-4', collapsed ? 'items-center px-2' : 'px-3'].join(' ')}>
      {showBrand && (
        <div className={['flex items-center', collapsed ? 'justify-center' : 'px-1'].join(' ')}>
          <Brand compact={collapsed} />
        </div>
      )}
      <nav aria-label={t('navbar.main_navigation')} className="w-full flex-1 overflow-y-auto">
        <ul className={['flex flex-col gap-1', collapsed ? 'items-center' : ''].join(' ')}>
          {NAV_ITEMS.map(({ id, href, labelKey }) => {
            const Icon = ICONS[id];
            const isActive = id === active;
            const label = t(labelKey);
            return (
              <li key={id} className={collapsed ? '' : 'w-full'}>
                <Hint text={collapsed ? label : undefined}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={collapsed ? label : undefined}
                    data-testid={`nav-${id}`}
                    className={[
                      'flex items-center gap-3 rounded-xl text-sm no-underline',
                      collapsed ? 'size-10 justify-center' : 'w-full px-3 py-2',
                      isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-default',
                    ].join(' ')}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    {!collapsed && label}
                  </Link>
                </Hint>
              </li>
            );
          })}
        </ul>
      </nav>
      <div
        className={[
          'flex w-full gap-2',
          collapsed ? 'flex-col items-center' : 'items-center justify-between px-1',
        ].join(' ')}
      >
        <ThemeSwitcher vertical={collapsed} />
        {onToggleCollapsed && (
          <Hint text={toggleLabel}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              data-testid="sidebar-toggle"
              onPress={onToggleCollapsed}
            >
              <ToggleIcon aria-hidden="true" className="size-5" />
            </Button>
          </Hint>
        )}
      </div>
    </div>
  );
}
