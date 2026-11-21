export type ThemeChoice = 'light' | 'dark' | 'auto';

export interface ThemeOption {
  value: ThemeChoice;
  /** Translation key of the label (same keys as the legacy theme toggle). */
  labelKey: string;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', labelKey: 'navbar.theme_light' },
  { value: 'dark', labelKey: 'navbar.theme_dark' },
  { value: 'auto', labelKey: 'navbar.theme_auto' },
];
