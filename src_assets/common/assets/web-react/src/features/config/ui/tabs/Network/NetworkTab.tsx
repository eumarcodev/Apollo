import { Alert } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { SelectChoice } from '@/features/config/domain/general-options';
import { DEFAULT_MOONLIGHT_PORT, effectivePort, PORT_MAX, PORT_MIN } from '@/features/config/domain/network-ports';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';
import { PortTable } from './PortTable';

const ADDRESS_FAMILY_CHOICES: readonly SelectChoice[] = [
  { value: 'ipv4', label: 'config.address_family_ipv4' },
  { value: 'both', label: 'config.address_family_both' },
];

const ORIGIN_WEB_UI_CHOICES: readonly SelectChoice[] = [
  { value: 'pc', label: 'config.origin_web_ui_allowed_pc' },
  { value: 'lan', label: 'config.origin_web_ui_allowed_lan' },
  { value: 'wan', label: 'config.origin_web_ui_allowed_wan' },
];

const LAN_ENCRYPTION_CHOICES: readonly SelectChoice[] = [
  { value: '0', label: '_common.disabled_def' },
  { value: '1', label: 'config.lan_encryption_mode_1' },
  { value: '2', label: 'config.lan_encryption_mode_2' },
];

const WAN_ENCRYPTION_CHOICES: readonly SelectChoice[] = [
  { value: '0', label: '_common.disabled' },
  { value: '1', label: 'config.wan_encryption_mode_1' },
  { value: '2', label: 'config.wan_encryption_mode_2' },
];

const AUDIO_QOS_CHOICES: readonly SelectChoice[] = [
  { value: 'video', label: 'config.audio_qos_video' },
  { value: 'voice', label: 'config.audio_qos_voice' },
  { value: 'disabled', label: 'config.audio_qos_disabled' },
];

/** Network tab (`network`): UPnP, address family, base port with its port table, web UI origin, encryption, QoS. */
export function NetworkTab({ config, update }: ConfigTabProps) {
  const { t } = useTranslation();
  const port = effectivePort(config['port']);

  return (
    <div className="flex flex-col gap-6" data-testid="config-network">
      <BooleanField
        id="upnp"
        localePrefix="config"
        value={config['upnp']}
        onChange={(value) => update('upnp', value)}
        default="false"
      />
      <SelectField
        id="address_family"
        label="config.address_family"
        desc="config.address_family_desc"
        value={config['address_family']}
        choices={ADDRESS_FAMILY_CHOICES}
        onChange={(value) => update('address_family', value)}
      />
      <div className="flex flex-col gap-3">
        <TextField
          id="port"
          type="number"
          min={PORT_MIN}
          max={PORT_MAX}
          label="config.port"
          desc="config.port_desc"
          placeholder={String(DEFAULT_MOONLIGHT_PORT)}
          value={String(config['port'])}
          onChange={(value) => update('port', value)}
        />
        <PortTable port={port} />
      </div>
      {config['origin_web_ui_allowed'] === 'wan' && (
        <Alert status="warning" data-testid="web-ui-wan-warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('config.port_warning')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <SelectField
        id="origin_web_ui_allowed"
        label="config.origin_web_ui_allowed"
        desc="config.origin_web_ui_allowed_desc"
        value={config['origin_web_ui_allowed']}
        choices={ORIGIN_WEB_UI_CHOICES}
        onChange={(value) => update('origin_web_ui_allowed', value)}
      />
      <TextField
        id="external_ip"
        label="config.external_ip"
        desc="config.external_ip_desc"
        placeholder="123.456.789.12"
        value={String(config['external_ip'] ?? '')}
        onChange={(value) => update('external_ip', value)}
      />
      <SelectField
        id="lan_encryption_mode"
        label="config.lan_encryption_mode"
        desc="config.lan_encryption_mode_desc"
        value={String(config['lan_encryption_mode'])}
        choices={LAN_ENCRYPTION_CHOICES}
        onChange={(value) => update('lan_encryption_mode', value)}
      />
      <SelectField
        id="wan_encryption_mode"
        label="config.wan_encryption_mode"
        desc="config.wan_encryption_mode_desc"
        value={String(config['wan_encryption_mode'])}
        choices={WAN_ENCRYPTION_CHOICES}
        onChange={(value) => update('wan_encryption_mode', value)}
      />
      <TextField
        id="ping_timeout"
        label="config.ping_timeout"
        desc="config.ping_timeout_desc"
        placeholder="10000"
        value={String(config['ping_timeout'])}
        onChange={(value) => update('ping_timeout', value)}
      />
      <SelectField
        id="audio_qos"
        label="config.audio_qos"
        desc="config.audio_qos_desc"
        value={config['audio_qos']}
        choices={AUDIO_QOS_CHOICES}
        onChange={(value) => update('audio_qos', value)}
      />
    </div>
  );
}
