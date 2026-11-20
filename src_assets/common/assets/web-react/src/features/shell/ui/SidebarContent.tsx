import { Link, Separator } from '@heroui/react';
import { House, Info, Layers, LockOpen, Settings, ShieldUser, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { findActiveNavItem, NAV_ITEMS, type NavItemId } from '@/features/shell/domain/navigation';
import { Brand } from './Brand';
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
}

/** Brand, navigation and theme switcher: the content of the desktop sidebar and of the mobile drawer. */
export function SidebarContent({ pathname, showBrand = true }: SidebarContentProps) {
  const { t } = useTranslation();
  const active = findActiveNavItem(pathname);
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {showBrand && <Brand />}
      <nav aria-label={t('navbar.main_navigation')} className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, href, labelKey }) => {
            const Icon = ICONS[id];
            const isActive = id === active;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`nav-${id}`}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm no-underline',
                    isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-default',
                  ].join(' ')}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Separator />
      <ThemeSwitcher />
    </div>
  );
}
