import type { ReactNode } from 'react';
import { DashboardFrame, PublicLayout } from '@/features/shell';

export type ShellLayout = 'shell' | 'bare';

export interface AppShellProps {
  /** `bare` for the public pages (welcome, login): centered, without the sidebar. */
  layout: ShellLayout;
  children: ReactNode;
}

/** Page frame: dashboard (sidebar + top bar) for the authenticated pages, centered layout for the public ones. */
export function AppShell({ layout, children }: AppShellProps) {
  return layout === 'bare' ? <PublicLayout>{children}</PublicLayout> : <DashboardFrame>{children}</DashboardFrame>;
}
