import { Button } from '@heroui/react';
import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { THEME_OPTIONS, type ThemeChoice } from '@/features/shell/domain/theme-options';
import { Hint } from './Hint';
import { useThemePreference } from './use-theme-preference';

const ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, auto: SunMoon };

/** Miniature of the interface (sidebar, top bar, cards) painted in one theme: the live preview of the choice. */
function MiniUi({ variant }: { variant: 'light' | 'dark' }) {
  return (
    <div className="helios-mini-ui" data-variant={variant}>
      <div className="helios-mini-sidebar">
        <span className="helios-mini-dot" />
        <span className="helios-mini-line helios-mini-active" />
        <span className="helios-mini-line" />
        <span className="helios-mini-line" />
      </div>
      <div className="helios-mini-main">
        <span className="helios-mini-bar" />
        <div className="helios-mini-cards">
          <span className="helios-mini-card" />
          <span className="helios-mini-card" />
        </div>
      </div>
    </div>
  );
}

/**
 * Light / dark / auto. Expanded: a card with the Helios orb and a segmented control with labels. `compact` (collapsed
 * sidebar): a vertical icon pill. The options are plain buttons (no popover) so it also works inside the drawer, where
 * a popover would count as an outside click and close it.
 */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [choice, select] = useThemePreference();
  const options = THEME_OPTIONS.map(({ value, labelKey }) => {
    const Icon = ICONS[value];
    const selected = choice === value;
    const label = t(labelKey);
    const button = (
      <Button
        key={value}
        size="sm"
        isIconOnly={compact}
        variant="ghost"
        aria-pressed={selected}
        aria-label={label}
        data-testid={`theme-${value}`}
        data-selected={selected}
        className={[
          'helios-segment min-w-0 rounded-lg',
          compact ? 'size-9' : 'h-9 flex-1 gap-1.5 px-1.5 text-[10px] font-semibold',
        ].join(' ')}
        onPress={() => select(value)}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {!compact && label}
      </Button>
    );
    return compact ? (
      <Hint key={value} text={label}>
        {button}
      </Hint>
    ) : (
      button
    );
  });

  if (compact) {
    return (
      <div
        role="group"
        aria-label={t('navbar.toggle_theme')}
        data-testid="theme-switcher"
        className="helios-segmented flex flex-col gap-1 rounded-xl p-1"
      >
        {options}
      </div>
    );
  }

  return (
    <div className="helios-feature-card relative w-full overflow-hidden rounded-xl p-3">
      <div aria-hidden="true" className="helios-theme-preview mb-3" data-preview={choice} data-testid="theme-preview">
        <MiniUi variant="light" />
        <MiniUi variant="dark" />
      </div>
      <div className="mb-3 flex flex-col gap-0.5 px-1">
        <span className="helios-display text-xl text-foreground">{t('navbar.toggle_theme')}</span>
        <span className="text-xs text-muted">{t('navbar.theme_hint')}</span>
      </div>
      <div
        role="group"
        aria-label={t('navbar.toggle_theme')}
        data-testid="theme-switcher"
        className="helios-segmented flex gap-1 rounded-xl p-1"
      >
        {options}
      </div>
    </div>
  );
}
