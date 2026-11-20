import { Tooltip } from '@heroui/react';
import type { ReactNode } from 'react';

/** Tooltip for icon-only controls; renders just the child when `text` is missing. */
export function Hint({ text, children }: { text?: string; children: ReactNode }) {
  if (!text) {
    return <>{children}</>;
  }
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content placement="right">{text}</Tooltip.Content>
    </Tooltip>
  );
}
