import { useCallback, useState } from 'react';
import type { ThemeChoice } from '@/features/shell/domain/theme-options';
import { applyTheme, getPreferredTheme, setStoredTheme } from '@/shared/ui';

/**
 * The theme choice shown by the switcher (stored value, or the system theme when nothing is stored, as the legacy
 * toggle did) and a setter that stores and applies it. `initTheme` (createPage) keeps `auto` following the system.
 */
export function useThemePreference(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(() => getPreferredTheme());
  const select = useCallback((next: ThemeChoice) => {
    setStoredTheme(next);
    applyTheme(next);
    setChoice(next);
  }, []);
  return [choice, select];
}
