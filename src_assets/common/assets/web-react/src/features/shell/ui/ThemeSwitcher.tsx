import { Button } from '@heroui/react';
import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { THEME_OPTIONS, type ThemeChoice } from '@/features/shell/domain/theme-options';
import { useThemePreference } from './use-theme-preference';

const ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, auto: SunMoon };

/**
 * Light / dark / auto choice. The options are listed directly (no popover) so it also works inside the drawer,
 * where a popover would count as an outside click and close it.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const [choice, select] = useThemePreference();
  return (
    <div
      role="group"
      aria-label={t('navbar.toggle_theme')}
      className="flex flex-col gap-2"
      data-testid="theme-switcher"
    >
      <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted">{t('navbar.toggle_theme')}</span>
      <div className="grid grid-cols-3 gap-1">
        {THEME_OPTIONS.map(({ value, labelKey }) => {
          const Icon = ICONS[value];
          const selected = choice === value;
          return (
            <Button
              key={value}
              size="sm"
              variant={selected ? 'primary' : 'ghost'}
              aria-pressed={selected}
              data-testid={`theme-${value}`}
              className="h-auto min-w-0 flex-col gap-1 px-1 py-2"
              onPress={() => select(value)}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="text-xs">{t(labelKey)}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
