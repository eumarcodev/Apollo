import { Button, Input } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { insertAt, removeAt, replaceAt } from '@/shared/kernel';

export interface DetachedCommandsEditorProps {
  commands: readonly string[];
  onChange: (commands: string[]) => void;
}

/** The `detached` list: one monospace command per row, with remove, insert-before and add-at-the-end. */
export function DetachedCommandsEditor({ commands, onChange }: DetachedCommandsEditorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2" data-testid="detached-editor">
      {commands.map((command, index) => (
        <div key={index} className="flex items-center gap-2" data-testid={`detached-row-${index}`}>
          <Input
            id={`detached-${index}`}
            aria-label={t('apps.detached_cmds')}
            className="w-full flex-1 font-mono"
            value={command}
            onChange={(event) => onChange(replaceAt(commands, index, event.target.value))}
          />
          <Button
            isIconOnly
            variant="danger"
            size="sm"
            aria-label={t('react_ui.remove_row')}
            data-testid={`detached-remove-${index}`}
            onPress={() => onChange(removeAt(commands, index))}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
          <Button
            isIconOnly
            variant="secondary"
            size="sm"
            aria-label={t('react_ui.insert_row')}
            data-testid={`detached-insert-${index}`}
            onPress={() => onChange(insertAt(commands, index, ''))}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        className="self-center"
        data-testid="detached-add"
        onPress={() => onChange(insertAt(commands, -1, ''))}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('apps.detached_cmds_add')}
      </Button>
    </div>
  );
}
