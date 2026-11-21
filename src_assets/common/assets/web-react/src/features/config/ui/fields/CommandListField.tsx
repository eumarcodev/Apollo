import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandListEditor, type CommandColumn, type CommandRow } from '@/shared/ui';
import type { Platform } from '@/shared/kernel';

export interface CommandListFieldProps<Row extends CommandRow> {
  /** Option key (`global_prep_cmd`...); becomes the DOM id of the section (hash navigation) and the cell id prefix. */
  id: string;
  /** Translation key of the title; default `config.<id>`. */
  label?: string;
  /** Translation key of the description (line breaks are kept); default `config.<id>_desc`; `""` hides it. */
  desc?: string;
  rows: readonly Row[];
  onChange: (rows: Row[]) => void;
  columns: ReadonlyArray<CommandColumn<Row>>;
  platform: Platform;
  createRow: (platform: Platform) => Row;
  /** Extra content under the description (e.g. a "learn more" link). */
  children?: ReactNode;
}

/** Config section with a title, a description and an editable command list (`CommandListEditor` from shared/ui). */
export function CommandListField<Row extends CommandRow>({
  id,
  label,
  desc,
  rows,
  onChange,
  columns,
  platform,
  createRow,
  children,
}: CommandListFieldProps<Row>) {
  const { t } = useTranslation();
  const descKey = desc ?? `config.${id}_desc`;
  return (
    <section id={id} className="flex flex-col gap-2" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-sm font-medium">
        {t(label ?? `config.${id}`)}
      </h3>
      {descKey !== '' && <p className="text-sm whitespace-pre-line text-muted">{t(descKey)}</p>}
      {children}
      <CommandListEditor
        idPrefix={id}
        rows={rows}
        onChange={onChange}
        columns={columns}
        platform={platform}
        createRow={createRow}
      />
    </section>
  );
}
