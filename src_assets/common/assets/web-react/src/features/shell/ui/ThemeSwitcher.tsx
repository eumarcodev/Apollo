import { Button } from '@heroui/react';
import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { THEME_OPTIONS, type ThemeChoice } from '@/features/shell/domain/theme-options';
import { Hint } from './Hint';
import { useThemePreference } from './use-theme-preference';

const ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, auto: SunMoon };

/**
 * Light / dark / auto as a compact icon pill. The options are plain buttons (no popover) so it also works inside the
 * drawer, where a popover would count as an outside click and close it. `vertical` stacks it for the collapsed sidebar.
 */
export function ThemeSwitcher({ vertical = false }: { vertical?: boolean }) {
  const { t } = useTranslation();
  const [choice, select] = useThemePreference();
  return (
    <div
      role="group"
      aria-label={t('navbar.toggle_theme')}
      data-testid="theme-switcher"
      className={['inline-flex gap-1 rounded-full bg-default p-1', vertical ? 'flex-col' : 'flex-row'].join(' ')}
    >
      {THEME_OPTIONS.map(({ value, labelKey }) => {
        const Icon = ICONS[value];
        const selected = choice === value;
        return (
          <Hint key={value} text={t(labelKey)}>
            <Button
              isIconOnly
              size="sm"
              variant={selected ? 'primary' : 'ghost'}
              aria-pressed={selected}
              aria-label={t(labelKey)}
              data-testid={`theme-${value}`}
              className="size-8 min-w-0 rounded-full"
              onPress={() => select(value)}
            >
              <Icon aria-hidden="true" className="size-4" />
            </Button>
          </Hint>
        );
      })}
    </div>
  );
}
