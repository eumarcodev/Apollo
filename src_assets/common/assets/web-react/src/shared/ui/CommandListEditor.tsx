import { Button, Input } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { fieldId, insertAt, removeAt, replaceAt, type Platform } from '@/shared/kernel';
import { BooleanField } from './BooleanField';

export type CommandRow = Record<string, unknown>;

export interface CommandColumn<Row extends CommandRow> {
  key: keyof Row & string;
  /** Translation key of the column header. */
  labelKey: string;
  /** `text` = plain input, `command` = monospace input, `boolean` = switch. */
  kind: 'text' | 'command' | 'boolean';
  /** Show the column only on these platforms (e.g. `elevated` on Windows). */
  platforms?: readonly Platform[];
  /** Label key of the switch in a `boolean` cell. */
  cellLabelKey?: string;
  /** Server default of a `boolean` cell (shows "Enabled/Disabled by default"). */
  cellDefault?: unknown;
  icon?: ReactNode;
}

export interface CommandListEditorProps<Row extends CommandRow> {
  /** Prefix of the DOM ids of the cells (`<idPrefix>-<column>-<row>`). */
  idPrefix: string;
  rows: readonly Row[];
  onChange: (rows: Row[]) => void;
  columns: ReadonlyArray<CommandColumn<Row>>;
  platform: Platform;
  /** New empty row; receives the platform so Windows rows can carry `elevated: false`. */
  createRow: (platform: Platform) => Row;
  addLabelKey?: string;
}

function isVisible<Row extends CommandRow>(column: CommandColumn<Row>, platform: Platform): boolean {
  return !column.platforms || column.platforms.includes(platform);
}

/**
 * Editable list of commands (global prep/state commands, app commands, client commands, server commands).
 * Actions as in the legacy tables: add at the end, insert at a row, remove a row.
 */
export function CommandListEditor<Row extends CommandRow>({
  idPrefix,
  rows,
  onChange,
  columns,
  platform,
  createRow,
  addLabelKey = 'config.add',
}: CommandListEditorProps<Row>) {
  const { t } = useTranslation();
  const visible = columns.filter((column) => isVisible(column, platform));

  const updateCell = (index: number, key: string, value: unknown) => {
    const row = rows[index];
    if (row) {
      onChange(replaceAt(rows, index, { ...row, [key]: value }));
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid={`${idPrefix}-editor`}>
      {rows.length > 0 && (
        <div role="table" aria-label={idPrefix} className="flex flex-col gap-2">
          <div role="row" className="hidden gap-2 text-sm font-medium text-muted md:flex">
            {visible.map((column) => (
              <div role="columnheader" key={column.key} className="flex flex-1 items-center gap-1">
                {column.icon}
                {t(column.labelKey)}
              </div>
            ))}
            <div role="columnheader" className="w-24" />
          </div>
          {rows.map((row, index) => (
            <div
              role="row"
              key={index}
              className="flex flex-col gap-2 md:flex-row md:items-center"
              data-testid={`${idPrefix}-row-${index}`}
            >
              {visible.map((column) => {
                const id = fieldId(idPrefix, column.key, index);
                return (
                  <div role="cell" key={column.key} className="flex-1">
                    {column.kind === 'boolean' ? (
                      <BooleanField
                        id={id}
                        value={row[column.key] ?? false}
                        onChange={(value) => updateCell(index, column.key, value)}
                        label={column.cellLabelKey ?? column.labelKey}
                        desc=""
                        default={column.cellDefault}
                      />
                    ) : (
                      <Input
                        id={id}
                        aria-label={t(column.labelKey)}
                        className={column.kind === 'command' ? 'w-full font-mono' : 'w-full'}
                        value={String(row[column.key] ?? '')}
                        onChange={(event) => updateCell(index, column.key, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              <div role="cell" className="flex w-24 justify-end gap-2">
                <Button
                  isIconOnly
                  variant="danger"
                  size="sm"
                  aria-label={t('react_ui.remove_row')}
                  data-testid={`${idPrefix}-remove-${index}`}
                  onPress={() => onChange(removeAt(rows, index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  variant="secondary"
                  size="sm"
                  aria-label={t('react_ui.insert_row')}
                  data-testid={`${idPrefix}-insert-${index}`}
                  onPress={() => onChange(insertAt(rows, index, createRow(platform)))}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        className="self-center"
        data-testid={`${idPrefix}-add`}
        onPress={() => onChange(insertAt(rows, -1, createRow(platform)))}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t(addLabelKey)}
      </Button>
    </div>
  );
}
