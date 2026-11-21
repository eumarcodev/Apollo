import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  title: ReactNode;
  description?: ReactNode;
}

/** Title block of a card: serif title and a muted description. */
export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="helios-display text-3xl lining-nums">{title}</h2>
      {description !== undefined && <p className="text-muted">{description}</p>}
    </div>
  );
}
