import { Description, Input, Label, TextField as HeroTextField } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export interface ConfigTextFieldProps {
  /** Option key; becomes the DOM id (hash navigation). */
  id: string;
  /** Translation key of the label. */
  label: string;
  /** Translation key of the description; omitted or `""` hides it. */
  desc?: string;
  /** Current option value (anything but a string is shown as an empty text). */
  value: unknown;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Monospace text (commands, paths). */
  monospace?: boolean;
  className?: string;
}

/** Labelled text input of a config option (legacy `<input type="text" class="form-control" v-model>` + `form-text`). */
export function TextField({
  id,
  label,
  desc,
  value,
  onChange,
  placeholder,
  monospace,
  className,
}: ConfigTextFieldProps) {
  const { t } = useTranslation();
  return (
    <HeroTextField
      id={id}
      className={className ?? 'w-full'}
      fullWidth
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
    >
      <Label>{t(label)}</Label>
      <Input placeholder={placeholder} className={monospace ? 'font-mono' : undefined} />
      {desc ? <Description className="whitespace-pre-line">{t(desc)}</Description> : null}
    </HeroTextField>
  );
}
