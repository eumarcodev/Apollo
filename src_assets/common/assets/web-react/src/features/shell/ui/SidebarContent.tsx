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

export const NAV_ICONS: Record<NavItemId, LucideIcon> = {
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

/** Brand, navigation and theme card: the content of the desktop sidebar and of the mobile drawer. */
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
  const toggle = onToggleCollapsed && (
    <Hint text={toggleLabel}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="text-muted hover:text-foreground"
        aria-label={toggleLabel}
        aria-expanded={!collapsed}
        data-testid="sidebar-toggle"
        onPress={onToggleCollapsed}
      >
        <ToggleIcon aria-hidden="true" className="size-[18px]" />
      </Button>
    </Hint>
  );
  return (
    <div className={['flex h-full flex-col gap-6 py-5', collapsed ? 'items-center px-3' : 'px-4'].join(' ')}>
      {(showBrand || toggle) && (
        <div
          className={[
            'flex w-full gap-2',
            collapsed ? 'flex-col items-center' : 'items-center justify-between pl-1',
          ].join(' ')}
        >
          {showBrand && <Brand compact={collapsed} />}
          {toggle}
        </div>
      )}
      <nav aria-label={t('navbar.main_navigation')} className="helios-nav-scroll w-full flex-1 overflow-y-auto px-1">
        {!collapsed && <p className="helios-eyebrow mb-4 px-2">{t('navbar.main_navigation')}</p>}
        <ul className={['flex flex-col gap-1.5', collapsed ? 'items-center' : ''].join(' ')}>
          {NAV_ITEMS.map(({ id, href, labelKey }) => {
            const Icon = NAV_ICONS[id];
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
                    data-collapsed={collapsed}
                    className={[
                      'helios-nav-link flex items-center gap-3 rounded-lg text-sm font-medium tracking-wide no-underline',
                      collapsed ? 'size-11 justify-center' : 'h-11 w-full px-3',
                    ].join(' ')}
                  >
                    <Icon aria-hidden="true" className="helios-nav-icon size-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </Hint>
              </li>
            );
          })}
        </ul>
      </nav>
      <ThemeSwitcher compact={collapsed} />
    </div>
  );
}
