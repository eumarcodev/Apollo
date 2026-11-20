import type { ReactNode } from 'react';

/** Centered layout of the public pages (welcome, login): no navigation, same theme. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground"
      data-layout="bare"
    >
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
