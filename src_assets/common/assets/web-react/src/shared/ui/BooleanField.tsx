import { Description, Label, Switch } from '@heroui/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createBooleanCodec, parseBooleanDefault, type BooleanLike } from '@/shared/kernel';

export interface BooleanFieldProps {
  id: string;
  /** Current option value in any boolean spelling (`true`, `1`, `"enabled"`, `"on"`...). */
  value: unknown;
  /** Receives the new value in the same spelling as the initial value. */
  onChange: (value: BooleanLike) => void;
  /** Translation key of the label; default `<localePrefix>.<id>`. */
  label?: string;
  /** Translation key of the description; default `<localePrefix>.<id>_desc`; `""` hides it (unless children). */
  desc?: string;
  localePrefix?: string;
  /** Swap which value means "on". */
  inverseValues?: boolean;
  /** Server default; shows "Enabled/Disabled by default" when it is a boolean-like value. */
  default?: unknown;
  isDisabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Control on the left; label, default hint and description stacked on the right (same look in every tab). */
const LAYOUT_CLASS =
  'flex-row items-start gap-3 [&_[data-slot=switch-content]]:flex-col [&_[data-slot=switch-content]]:items-start [&_[data-slot=switch-content]]:gap-1';

/** Boolean option switch, port of the legacy Checkbox.vue. */
export function BooleanField({
  id,
  value,
  onChange,
  label,
  desc,
  localePrefix = 'missing-prefix',
  inverseValues = false,
  default: defaultValue,
  isDisabled = false,
  className,
  children,
}: BooleanFieldProps) {
  const { t } = useTranslation();
  // The representation is detected once, from the value present when the field mounts (legacy behaviour).
  const [codec] = useState(() => {
    const created = createBooleanCodec(value, inverseValues);
    if (!created.recognized) {
      console.error(`Checkbox value ${String(value)} for "${id}" did not match any acceptable pattern!`);
    }
    return created;
  });
  const parsedDefault = parseBooleanDefault(defaultValue);
  const labelKey = label ?? `${localePrefix}.${id}`;
  const descKey = desc ?? `${localePrefix}.${id}_desc`;
  const hasChildren = children !== undefined && children !== null && children !== false;
  const showDesc = desc !== '' || hasChildren;

  return (
    <Switch
      id={id}
      className={className ? `${LAYOUT_CLASS} ${className}` : LAYOUT_CLASS}
      isSelected={codec.isOn(value)}
      isDisabled={isDisabled}
      onChange={(on) => onChange(codec.encode(on))}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content>
        <Label>{t(labelKey)}</Label>
        {parsedDefault !== null && (
          <Description data-testid={`${id}-default`}>
            {t(parsedDefault ? '_common.enabled_def_cbox' : '_common.disabled_def_cbox')}
          </Description>
        )}
        {showDesc && (
          <Description>
            {desc === '' ? null : t(descKey)}
            {children}
          </Description>
        )}
      </Switch.Content>
    </Switch>
  );
}
