import { Button, Description, Input, Label, ListBox, NumberField, Select, Slider, TextField } from '@heroui/react';
import { ArrowLeft, FileDown, Play, Save, ShieldCheck, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COMMAND_LIST_TYPES,
  gamepadOptions,
  hasGamepadOverride,
  listField,
  newAppCommand,
  savableName,
  SCALE_FACTOR,
  scaleFactorValue,
  type AppCommand,
} from '@/features/apps/domain/app-editor';
import type { AppEntry } from '@/features/apps/domain/app-entry';
import type { Platform } from '@/shared/kernel';
import { BooleanField, CommandListEditor, PageLayout, PlatformOnly, type CommandColumn } from '@/shared/ui';
import { DetachedCommandsEditor } from './DetachedCommandsEditor';
import { EnvVarsReference } from './EnvVarsReference';

export interface AppEditorProps {
  /** The app to edit, already merged over the new-app template. */
  initial: AppEntry;
  platform: Platform | null;
  /** A host request runs: Save is disabled. */
  busy: boolean;
  onCancel: () => void;
  /** Receives the edited app; the caller normalises and posts it. */
  onSave: (app: AppEntry) => void;
  onExport: (app: AppEntry) => void;
  /** Slot next to the name field (the online cover finder plugs in here). */
  nameAddon?: ReactNode;
}

/** Sentinel id of the "Default (Global)" option: a list box item cannot have the empty string as id. */
const GLOBAL_GAMEPAD = '__global__';

const COMMAND_COLUMNS: ReadonlyArray<CommandColumn<AppCommand>> = [
  { key: 'do', labelKey: '_common.do_cmd', kind: 'command', icon: <Play aria-hidden="true" className="size-4" /> },
  { key: 'undo', labelKey: '_common.undo_cmd', kind: 'command', icon: <Undo2 aria-hidden="true" className="size-4" /> },
  {
    key: 'elevated',
    labelKey: '_common.run_as',
    kind: 'boolean',
    platforms: ['windows'],
    cellLabelKey: '_common.elevated',
    icon: <ShieldCheck aria-hidden="true" className="size-4" />,
  },
];

interface TextInputProps {
  id: string;
  label: string;
  description: ReactNode;
  value: unknown;
  onChange: (value: string) => void;
  mono?: boolean;
}

function TextInput({ id, label, description, value, onChange, mono = true }: TextInputProps) {
  return (
    <TextField id={id} value={String(value ?? '')} onChange={onChange} fullWidth>
      <Label>{label}</Label>
      <Input data-testid={id} className={mono ? 'font-mono' : undefined} />
      <Description>{description}</Description>
    </TextField>
  );
}

function Section({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section className="helios-panel flex flex-col gap-6 rounded-2xl p-4 sm:p-6" data-testid={testId}>
      <h2 className="helios-display text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Note({ text, note }: { text: string; note: string }) {
  const { t } = useTranslation();
  return (
    <>
      {text}
      <br />
      <b>{t('_common.note')}</b> {note}
    </>
  );
}

/** Create/edit form of an application, with every field, default and platform rule of the legacy editor. */
export function AppEditor({ initial, platform, busy, onCancel, onSave, onExport, nameAddon }: AppEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AppEntry>(initial);
  const set = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  const canSave = !busy && savableName(draft) !== null;
  // CommandListEditor needs a platform; an unknown one shows no Windows-only column, like the legacy editor.
  const listPlatform: Platform = platform ?? 'linux';

  const buttons = (where: 'top' | 'bottom') => (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        data-testid={`editor-cancel${where === 'bottom' ? '-bottom' : ''}`}
        onPress={onCancel}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t('_common.cancel')}
      </Button>
      <Button
        variant="primary"
        data-testid={`editor-save${where === 'bottom' ? '-bottom' : ''}`}
        isDisabled={!canSave}
        onPress={() => onSave(draft)}
      >
        <Save aria-hidden="true" className="size-4" />
        {t('_common.save')}
      </Button>
      {where === 'top' && (
        <Button variant="outline" data-testid="editor-export" isDisabled={!draft.uuid} onPress={() => onExport(draft)}>
          <FileDown aria-hidden="true" className="size-4" />
          {t('apps.export_launcher_file')}
        </Button>
      )}
    </div>
  );

  const scaleFactor = scaleFactorValue(draft['scale-factor']);
  const exitTimeout = Number.parseFloat(String(draft['exit-timeout'] ?? ''));

  return (
    <PageLayout title={draft.name || t('apps.no_name')} actions={buttons('top')}>
      <div className="flex flex-col gap-6" data-testid="app-editor">
        <Section title={t('apps.editor_general')} testId="editor-general">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <TextInput
                id="appName"
                label={t('apps.app_name')}
                description={t('apps.app_name_desc')}
                value={draft.name}
                onChange={(value) => set('name', value)}
                mono={false}
              />
            </div>
            <div className="sm:pt-6" data-testid="cover-finder-slot">
              {nameAddon}
            </div>
          </div>
          <TextInput
            id="appImagePath"
            label={t('apps.image')}
            description={t('apps.image_desc')}
            value={draft['image-path']}
            onChange={(value) => set('image-path', value)}
          />
          {hasGamepadOverride(platform) && (
            <Select
              id="gamepad"
              fullWidth
              value={
                draft['gamepad'] === '' || draft['gamepad'] === undefined ? GLOBAL_GAMEPAD : String(draft['gamepad'])
              }
              onChange={(key) => set('gamepad', key === GLOBAL_GAMEPAD ? '' : String(key ?? ''))}
              data-testid="gamepad"
            >
              <Label>{t('config.gamepad')}</Label>
              <Select.Trigger data-testid="gamepad-trigger">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Description>{t('config.gamepad_desc')}</Description>
              <Select.Popover>
                <ListBox>
                  {gamepadOptions(platform).map((option) => {
                    const id = option.value === '' ? GLOBAL_GAMEPAD : option.value;
                    return (
                      <ListBox.Item key={id} id={id} textValue={t(option.labelKey)} data-testid={`gamepad-${id}`}>
                        {t(option.labelKey)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    );
                  })}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
          <TextInput
            id="appCmd"
            label={t('apps.cmd')}
            description={<Note text={t('apps.cmd_desc')} note={t('apps.cmd_note')} />}
            value={draft['cmd']}
            onChange={(value) => set('cmd', value)}
          />
          <PlatformOnly platform={platform} platforms={['windows']}>
            <BooleanField
              id="appElevation"
              label="_common.run_as"
              desc="apps.run_as_desc"
              value={draft['elevated']}
              onChange={(value) => set('elevated', value)}
              default="false"
            />
          </PlatformOnly>
        </Section>

        <Section title={t('apps.editor_commands')} testId="editor-commands">
          <div className="flex flex-col gap-2">
            <Label>{t('apps.detached_cmds')}</Label>
            <DetachedCommandsEditor
              commands={listField<string>(draft, 'detached')}
              onChange={(commands) => set('detached', commands)}
            />
            <Description>
              <Note text={t('apps.detached_cmds_desc')} note={t('apps.detached_cmds_note')} />
            </Description>
          </div>
          <BooleanField
            id="clientCommands"
            label="apps.allow_client_commands"
            desc="apps.allow_client_commands_desc"
            value={draft['allow-client-commands']}
            onChange={(value) => set('allow-client-commands', value)}
            default="true"
          />
          {COMMAND_LIST_TYPES.map((type) => (
            <div key={type} className="flex flex-col gap-4" data-testid={`${type}-cmds`}>
              <BooleanField
                id={`excludeGlobal_${type}`}
                label={`apps.global_${type}_name`}
                desc={`apps.global_${type}_desc`}
                value={draft[`exclude-global-${type}-cmd`]}
                onChange={(value) => set(`exclude-global-${type}-cmd`, value)}
                default="true"
                inverseValues
              />
              <div className="flex flex-col gap-2">
                <Label>{t(`apps.cmd_${type}_name`)}</Label>
                <Description className="whitespace-pre-wrap">{t(`apps.cmd_${type}_desc`)}</Description>
                <CommandListEditor<AppCommand>
                  idPrefix={`${type}-cmd`}
                  rows={listField<AppCommand>(draft, `${type}-cmd`)}
                  onChange={(rows) => set(`${type}-cmd`, rows)}
                  columns={COMMAND_COLUMNS}
                  platform={listPlatform}
                  createRow={() => newAppCommand(platform)}
                  addLabelKey="apps.add_cmds"
                />
              </div>
            </div>
          ))}
        </Section>

        <Section title={t('apps.editor_behavior')} testId="editor-behavior">
          <TextInput
            id="appWorkingDir"
            label={t('apps.working_dir')}
            description={t('apps.working_dir_desc')}
            value={draft['working-dir']}
            onChange={(value) => set('working-dir', value)}
          />
          <TextInput
            id="appOutput"
            label={t('apps.output_name')}
            description={t('apps.output_desc')}
            value={draft['output']}
            onChange={(value) => set('output', value)}
          />
          <BooleanField
            id="autoDetach"
            label="apps.auto_detach"
            desc="apps.auto_detach_desc"
            value={draft['auto-detach']}
            onChange={(value) => set('auto-detach', value)}
            default="true"
          />
          <BooleanField
            id="waitAll"
            label="apps.wait_all"
            desc="apps.wait_all_desc"
            value={draft['wait-all']}
            onChange={(value) => set('wait-all', value)}
            default="true"
          />
          <BooleanField
            id="terminateOnPause"
            label="apps.terminate_on_pause"
            desc="apps.terminate_on_pause_desc"
            value={draft['terminate-on-pause']}
            onChange={(value) => set('terminate-on-pause', value)}
            default="false"
          />
          <NumberField
            id="exitTimeout"
            minValue={0}
            value={exitTimeout}
            onChange={(value) => set('exit-timeout', Number.isNaN(value) ? '' : value)}
            formatOptions={{ useGrouping: false, maximumFractionDigits: 0 }}
            fullWidth
          >
            <Label>{t('apps.exit_timeout')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input placeholder="5" className="font-mono" data-testid="exitTimeout" />
              <NumberField.IncrementButton />
            </NumberField.Group>
            <Description>{t('apps.exit_timeout_desc')}</Description>
          </NumberField>
          <BooleanField
            id="virtualDisplay"
            label="apps.virtual_display"
            desc="apps.virtual_display_desc"
            value={draft['virtual-display']}
            onChange={(value) => set('virtual-display', value)}
            default="false"
          />
          <BooleanField
            id="useAppIdentity"
            label="apps.use_app_identity"
            desc="apps.use_app_identity_desc"
            value={draft['use-app-identity']}
            onChange={(value) => set('use-app-identity', value)}
            default="false"
          />
          {Boolean(draft['use-app-identity']) && (
            <BooleanField
              id="perClientAppIdentity"
              label="apps.per_client_app_identity"
              desc="apps.per_client_app_identity_desc"
              value={draft['per-client-app-identity']}
              onChange={(value) => set('per-client-app-identity', value)}
              default="false"
            />
          )}
          <PlatformOnly platform={platform} platforms={['windows']}>
            <div className="flex flex-col gap-2">
              <Slider
                id="resolutionScaleFactor"
                minValue={SCALE_FACTOR.min}
                maxValue={SCALE_FACTOR.max}
                step={SCALE_FACTOR.step}
                value={scaleFactor}
                onChange={(value) => set('scale-factor', Array.isArray(value) ? value[0] : value)}
                className="w-full"
                data-testid="scale-factor"
              >
                <Label data-testid="scale-factor-label">{`${t('apps.resolution_scale_factor')}: ${String(draft['scale-factor'])}%`}</Label>
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
              <Description>{t('apps.resolution_scale_factor_desc')}</Description>
            </div>
          </PlatformOnly>
        </Section>

        <section className="helios-panel rounded-2xl p-4 sm:p-6" data-testid="editor-env">
          <EnvVarsReference platform={platform} />
        </section>

        {buttons('bottom')}
      </div>
    </PageLayout>
  );
}
