import { Button, Description, FieldError, Input, Label, TextField, ToggleButton } from '@heroui/react';
import { Check, Shield, Terminal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createCommandRow,
  isCommandsEnabled,
  isValidDisplayMode,
  type ClientCommand,
  type ClientDraft,
} from '@/features/clients/domain/client';
import {
  PERMISSION_GROUPS,
  isGranted,
  isSuppressed,
  togglePermission,
  type PermissionName,
} from '@/features/clients/domain/permissions';
import type { Platform } from '@/shared/kernel';
import { BooleanField, CommandListEditor, PlatformOnly, type CommandColumn } from '@/shared/ui';
import { DOCS_URL } from './links';
import { LearnMore } from './LearnMore';
import { PermissionBadge } from './PermissionBadge';

export interface ClientEditorProps {
  draft: ClientDraft;
  /** Host platform; null until `GET /api/config` answers (Windows-only fields stay hidden). */
  platform: Platform | null;
  onChange: (patch: Partial<ClientDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const COMMAND_COLUMNS: ReadonlyArray<CommandColumn<ClientCommand>> = [
  {
    key: 'cmd',
    labelKey: '_common.cmd_val',
    kind: 'command',
    icon: <Terminal aria-hidden="true" className="size-4" />,
  },
  {
    key: 'elevated',
    labelKey: '_common.run_as',
    kind: 'boolean',
    platforms: ['windows'],
    cellLabelKey: '_common.elevated',
    icon: <Shield aria-hidden="true" className="size-4" />,
  },
];

interface CommandsFieldProps {
  kind: 'do' | 'undo';
  rows: readonly ClientCommand[];
  platform: Platform;
  onChange: (rows: ClientCommand[]) => void;
}

function CommandsField({ kind, rows, platform, onChange }: CommandsFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2" data-testid={`client-${kind}-field`}>
      <span className="font-medium">{t(`pin.client_${kind}_cmd`)}</span>
      <p className="text-sm text-muted">
        {t(`pin.client_${kind}_cmd_desc`)} <LearnMore href={DOCS_URL} />
      </p>
      <CommandListEditor
        idPrefix={`client-${kind}-cmd`}
        rows={rows}
        onChange={onChange}
        columns={COMMAND_COLUMNS}
        platform={platform}
        createRow={createCommandRow}
        insertPosition="after"
      />
    </div>
  );
}

/** Editor of one paired device: name, permissions, ordering, virtual display, display mode and client commands. */
export function ClientEditor({ draft, platform, onChange, onSave, onCancel }: ClientEditorProps) {
  const { t } = useTranslation();
  const displayModeValid = isValidDisplayMode(draft.displayMode);
  const toggle = (name: PermissionName) => onChange({ perm: togglePermission(draft.perm, name) });

  return (
    <li className="flex flex-col gap-6 rounded-xl border border-accent/40 px-4 py-4" data-testid="client-editor">
      <div className="flex flex-wrap items-end gap-3">
        <PermissionBadge perm={draft.perm} testId="edit-perm-badge" />
        <TextField
          aria-label={t('pin.device_name')}
          value={draft.name}
          onChange={(name) => onChange({ name })}
          className="min-w-56 flex-1"
        >
          <Input
            placeholder={t('pin.device_name')}
            autoFocus
            data-testid="edit-name"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && displayModeValid) {
                onSave();
              }
            }}
          />
        </TextField>
        <Button variant="primary" isDisabled={!displayModeValid} data-testid="edit-save" onPress={onSave}>
          <Check aria-hidden="true" className="size-4" />
          {t('_common.save')}
        </Button>
        <Button variant="secondary" data-testid="edit-cancel" onPress={onCancel}>
          <X aria-hidden="true" className="size-4" />
          {t('_common.cancel')}
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-3" data-testid="edit-permissions">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-2" data-testid={`perm-group-${group.id}`}>
            <span className="helios-eyebrow">{t(`pin.perm_group_${group.id}`)}</span>
            <div className="flex flex-wrap gap-2">
              {group.permissions.map((definition) => {
                const suppressed = isSuppressed(draft.perm, definition);
                const granted = isGranted(draft.perm, definition);
                return (
                  <ToggleButton
                    key={definition.name}
                    isSelected={granted}
                    isDisabled={suppressed}
                    onChange={() => toggle(definition.name)}
                    data-testid={`perm-${definition.name}`}
                    data-granted={granted ? 'true' : 'false'}
                  >
                    {granted && <Check aria-hidden="true" className="size-4" />}
                    {t(`permissions.${definition.name}`)}
                  </ToggleButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <BooleanField
          id="enable_legacy_ordering"
          value={draft.enableLegacyOrdering}
          onChange={(enableLegacyOrdering) => onChange({ enableLegacyOrdering })}
          label="pin.enable_legacy_ordering"
          desc="pin.enable_legacy_ordering_desc"
          default="true"
        />
        <PlatformOnly platform={platform} platforms={['windows']}>
          <BooleanField
            id="always_use_virtual_display"
            value={draft.alwaysUseVirtualDisplay}
            onChange={(alwaysUseVirtualDisplay) => onChange({ alwaysUseVirtualDisplay })}
            label="pin.always_use_virtual_display"
            desc="pin.always_use_virtual_display_desc"
            default="false"
          />
        </PlatformOnly>
        <TextField
          value={draft.displayMode}
          onChange={(displayMode) => onChange({ displayMode })}
          isInvalid={!displayModeValid}
          className="max-w-md"
        >
          <Label>{t('pin.display_mode_override')}</Label>
          <Input id="display_mode_override" placeholder="1920x1080x59.94" data-testid="edit-display-mode" />
          <Description>
            {t('pin.display_mode_override_desc')} <LearnMore href={DOCS_URL} />
          </Description>
          <FieldError data-testid="edit-display-mode-error">{t('pin.display_mode_override_error')}</FieldError>
        </TextField>
        <BooleanField
          id="allow_client_commands"
          value={draft.allowClientCommands}
          onChange={(allowClientCommands) => onChange({ allowClientCommands })}
          label="pin.allow_client_commands"
          desc="pin.allow_client_commands_desc"
          default="true"
        />
      </div>

      {isCommandsEnabled(draft) && (
        <div className="flex flex-col gap-6" data-testid="client-commands">
          <CommandsField
            kind="do"
            rows={draft.doCmds}
            platform={platform ?? 'linux'}
            onChange={(doCmds) => onChange({ doCmds })}
          />
          <CommandsField
            kind="undo"
            rows={draft.undoCmds}
            platform={platform ?? 'linux'}
            onChange={(undoCmds) => onChange({ undoCmds })}
          />
        </div>
      )}
    </li>
  );
}
