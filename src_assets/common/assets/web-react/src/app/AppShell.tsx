import type { ReactNode } from 'react';

export type ShellLayout = 'shell' | 'bare';

export interface AppShellProps {
  /** `bare` for the public pages (welcome, login), which have no navigation in the legacy UI either. */
  layout: ShellLayout;
  children: ReactNode;
}

/**
 * Page frame. The navigation (navbar, theme toggle, update banner) is added by the shell slice; until then the
 * shell only provides the main landmark.
 */
export function AppShell({ layout, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground" data-layout={layout}>
      {children}
    </main>
  );
}
