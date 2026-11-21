import { buttonVariants } from '@heroui/react';
import type { ReactNode } from 'react';

export interface ExternalLinkProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger-soft';
  icon?: ReactNode;
  children: ReactNode;
  testId?: string;
}

/** A link that looks like a HeroUI button and opens in a new tab. */
export function ExternalLink({ href, variant = 'secondary', icon, children, testId }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant, size: 'md' })}
      data-testid={testId}
    >
      {icon}
      {children}
    </a>
  );
}
