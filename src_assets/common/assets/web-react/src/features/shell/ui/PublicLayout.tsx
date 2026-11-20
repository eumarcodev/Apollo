import type { ReactNode } from 'react';

/** Centered layout of the public pages (welcome, login): no navigation, same theme and backdrop. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="helios-backdrop flex min-h-screen items-center justify-center p-4 text-foreground"
      data-layout="bare"
    >
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
