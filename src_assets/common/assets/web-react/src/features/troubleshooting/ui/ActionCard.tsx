import { Alert, Button } from '@heroui/react';
import type { ReactElement, ReactNode } from 'react';

export interface ActionNotice {
  status: 'success' | 'danger';
  text: ReactNode;
}

export interface ActionCardProps {
  /** Anchor id of the card (`close_apps`, `restart`, `quit`, `dd_reset`); also the base of the test ids. */
  id: string;
  icon: ReactElement;
  title: ReactNode;
  description: ReactNode;
  /** Keep the line breaks of the description. */
  preLine?: boolean;
  notice?: ActionNotice | null;
  buttonLabel: ReactNode;
  buttonVariant?: 'secondary' | 'danger';
  isDisabled?: boolean;
  onPress: () => void;
}

/** One maintenance action: title, what it does, the result of the last run and the button that runs it. */
export function ActionCard({
  id,
  icon,
  title,
  description,
  preLine = false,
  notice,
  buttonLabel,
  buttonVariant = 'secondary',
  isDisabled = false,
  onPress,
}: ActionCardProps) {
  return (
    <section
      id={id}
      className="helios-panel flex scroll-mt-6 flex-col gap-5 rounded-2xl p-6"
      data-testid={`card-${id}`}
    >
      <div className="flex flex-col gap-2">
        <h2 className="helios-display flex items-center gap-3 text-3xl lining-nums">
          <span aria-hidden="true" className="shrink-0" style={{ color: 'var(--helios-gold-text)' }}>
            {icon}
          </span>
          {title}
        </h2>
        <p className={preLine ? 'text-muted whitespace-pre-line' : 'text-muted'}>{description}</p>
      </div>
      <div aria-live="polite" className="empty:hidden">
        {notice && (
          <Alert status={notice.status} data-testid={`${id}-notice`} data-status={notice.status}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{notice.text}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </div>
      <div className="mt-auto">
        <Button variant={buttonVariant} isDisabled={isDisabled} onPress={onPress} data-testid={`${id}-button`}>
          {buttonLabel}
        </Button>
      </div>
    </section>
  );
}
