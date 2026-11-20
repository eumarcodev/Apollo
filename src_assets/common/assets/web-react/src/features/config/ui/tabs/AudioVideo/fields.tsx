import { Description, FieldError, Input, Label, TextField } from '@heroui/react';
import type { ReactNode } from 'react';

export interface TextOptionFieldProps {
  /** Option key; it is also the DOM id of the input (hash navigation). */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: ReactNode;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  /** Message shown (and the field marked invalid) when set. */
  error?: string;
  /** Help blocks (commands, examples) shown under the description. */
  children?: ReactNode;
}

/** Labelled text or number input of a configuration option, with its help text below. */
export function TextOptionField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  type = 'text',
  min,
  max,
  error,
  children,
}: TextOptionFieldProps) {
  return (
    <div className="flex flex-col gap-2" data-testid={`field-${id}`}>
      <TextField fullWidth value={value} onChange={onChange} isInvalid={error !== undefined} className="gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} type={type} min={min} max={max} placeholder={placeholder} />
        {description !== undefined && <Description className="whitespace-pre-line">{description}</Description>}
        {error !== undefined && <FieldError>{error}</FieldError>}
      </TextField>
      {children}
    </div>
  );
}

/** Monospace block for a command or an example output. */
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-default px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

/** Link to an outside page, opened in a new tab. */
export function OutsideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
      {children}
    </a>
  );
}

/** A titled group of fields of the tab. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby={`${id}-title`} data-testid={id}>
      <h3 id={`${id}-title`} className="helios-eyebrow">
        {title}
      </h3>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

/** Stacks the label, the default hint and the description of a switch, with the control on the left. */
export const SWITCH_CLASS =
  'flex-row items-start gap-3 [&_[data-slot=switch-content]]:flex-col [&_[data-slot=switch-content]]:items-start [&_[data-slot=switch-content]]:gap-1';
