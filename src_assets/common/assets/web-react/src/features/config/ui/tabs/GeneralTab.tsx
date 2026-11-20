import { ExternalLink, Play, Shield, Tag, Terminal, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PrepCommand, ServerCommand } from '@/features/config/domain/config-model';
import {
  createPrepCommand,
  createServerCommand,
  localeChoices,
  LOG_LEVEL_CHOICES,
  SERVER_COMMANDS_DOCS_URL,
  UPDATE_CHANNEL_CHOICES,
} from '@/features/config/domain/general-options';
import type { CommandColumn } from '@/shared/ui';
import { BooleanField, CommandListField, SelectField, TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from './types';

const ICON = 'size-4';

/** Run as Admin column, shown on Windows only. */
function elevatedColumn<Row extends { elevated?: boolean }>(): CommandColumn<Row> {
  return {
    key: 'elevated',
    labelKey: '_common.run_as',
    cellLabelKey: '_common.elevated',
    kind: 'boolean',
    platforms: ['windows'],
    icon: <Shield aria-hidden="true" className={ICON} />,
  };
}

const PREP_COLUMNS: ReadonlyArray<CommandColumn<PrepCommand>> = [
  { key: 'do', labelKey: '_common.do_cmd', kind: 'command', icon: <Play aria-hidden="true" className={ICON} /> },
  { key: 'undo', labelKey: '_common.undo_cmd', kind: 'command', icon: <Undo2 aria-hidden="true" className={ICON} /> },
  { ...elevatedColumn<PrepCommand>(), cellDefault: 'false' },
];

const SERVER_COLUMNS: ReadonlyArray<CommandColumn<ServerCommand>> = [
  { key: 'name', labelKey: '_common.cmd_name', kind: 'text', icon: <Tag aria-hidden="true" className={ICON} /> },
  { key: 'cmd', labelKey: '_common.cmd_val', kind: 'command', icon: <Terminal aria-hidden="true" className={ICON} /> },
  elevatedColumn<ServerCommand>(),
];

/** General tab (`General.vue`): locale, name, log level, command lists, pairing, discovery, update channel, tray. */
export function GeneralTab({ config, platform, update }: ConfigTabProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6" data-testid="config-general">
      <SelectField
        id="locale"
        label="config.locale"
        desc="config.locale_desc"
        value={config['locale']}
        choices={localeChoices(config['locale'])}
        onChange={(value) => update('locale', value)}
      />
      <TextField
        id="sunshine_name"
        label="config.sunshine_name"
        desc="config.sunshine_name_desc"
        placeholder="Helios"
        value={config['sunshine_name']}
        onChange={(value) => update('sunshine_name', value)}
      />
      <SelectField
        id="min_log_level"
        label="config.min_log_level"
        desc="config.min_log_level_desc"
        value={config['min_log_level']}
        choices={LOG_LEVEL_CHOICES}
        onChange={(value) => update('min_log_level', value)}
      />
      <CommandListField
        id="global_prep_cmd"
        rows={config.global_prep_cmd}
        onChange={(rows) => update('global_prep_cmd', rows)}
        columns={PREP_COLUMNS}
        platform={platform}
        createRow={createPrepCommand}
      />
      <CommandListField
        id="global_state_cmd"
        rows={config.global_state_cmd}
        onChange={(rows) => update('global_state_cmd', rows)}
        columns={PREP_COLUMNS}
        platform={platform}
        createRow={createPrepCommand}
      />
      <CommandListField
        id="server_cmd"
        rows={config.server_cmd}
        onChange={(rows) => update('server_cmd', rows)}
        columns={SERVER_COLUMNS}
        platform={platform}
        createRow={createServerCommand}
      >
        <a
          href={SERVER_COMMANDS_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm text-accent underline-offset-4 hover:underline"
          data-testid="server_cmd-learn-more"
        >
          {t('_common.learn_more')}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </CommandListField>
      <BooleanField
        id="enable_pairing"
        localePrefix="config"
        value={config['enable_pairing']}
        onChange={(value) => update('enable_pairing', value)}
        default="true"
      />
      <BooleanField
        id="enable_discovery"
        localePrefix="config"
        value={config['enable_discovery']}
        onChange={(value) => update('enable_discovery', value)}
        default="true"
      />
      <SelectField
        id="update_channel"
        label="config.update_channel"
        desc="config.update_channel_desc"
        value={config['update_channel']}
        choices={UPDATE_CHANNEL_CHOICES}
        onChange={(value) => update('update_channel', value)}
      />
      <BooleanField
        id="system_tray"
        localePrefix="config"
        value={config['system_tray']}
        onChange={(value) => update('system_tray', value)}
        default="true"
      />
      <BooleanField
        id="hide_tray_controls"
        localePrefix="config"
        value={config['hide_tray_controls']}
        onChange={(value) => update('hide_tray_controls', value)}
        default="false"
      />
    </div>
  );
}
