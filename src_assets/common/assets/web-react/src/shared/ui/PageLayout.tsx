import type { ReactNode } from 'react';

export interface PageLayoutProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Extra content on the right of the title (buttons). */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Page container with the title block used by every page. */
export function PageLayout({ title, description, actions, className, children }: PageLayoutProps) {
  return (
    <section
      className={['flex w-full max-w-[1920px] flex-col gap-6 px-1 pt-1 pb-8 sm:px-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title !== undefined && <h1 className="helios-display text-5xl">{title}</h1>}
            {description !== undefined && <p className="text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
