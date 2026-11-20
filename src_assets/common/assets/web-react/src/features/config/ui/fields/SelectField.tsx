import { Description, Label, ListBox, Select } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { SelectChoice } from '@/features/config/domain/general-options';

export interface SelectFieldProps {
  /** Option key; becomes the DOM id (hash navigation). */
  id: string;
  /** Translation key of the label. */
  label: string;
  /** Translation key of the description; omitted or `""` hides it. */
  desc?: string;
  /** Current option value (any type: it is compared as a string, `undefined` selects nothing). */
  value: unknown;
  choices: readonly SelectChoice[];
  /** Receives the `value` of the picked choice (always a string, like the legacy `<option value>`). */
  onChange: (value: string) => void;
  className?: string;
}

/** React Aria does not accept an empty key; the choice with the empty value (e.g. automatic) uses this one. */
const EMPTY_KEY = '__empty__';

const toKey = (value: string) => (value === '' ? EMPTY_KEY : value);

/** Labelled select of a config option (legacy `<select class="form-select" v-model>` + `form-text`). */
export function SelectField({ id, label, desc, value, choices, onChange, className }: SelectFieldProps) {
  const { t } = useTranslation();
  const current = value === undefined || value === null ? null : toKey(String(value));
  return (
    <Select
      id={id}
      className={className ?? 'w-full'}
      fullWidth
      selectedKey={current}
      onSelectionChange={(key) => {
        const picked = choices.find((choice) => toKey(choice.value) === String(key));
        if (picked) {
          onChange(picked.value);
        }
      }}
    >
      <Label>{t(label)}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {desc ? <Description className="whitespace-pre-line">{t(desc)}</Description> : null}
      <Select.Popover>
        <ListBox>
          {choices.map((choice) => (
            <ListBox.Item
              key={choice.value}
              id={toKey(choice.value)}
              textValue={choice.raw ? choice.label : t(choice.label)}
            >
              {choice.raw ? choice.label : t(choice.label)}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
