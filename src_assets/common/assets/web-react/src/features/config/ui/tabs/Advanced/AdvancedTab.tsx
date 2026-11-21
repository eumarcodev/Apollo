import {
  AV1_MODE_CHOICES,
  captureChoices,
  encoderChoices,
  HEVC_MODE_CHOICES,
} from '@/features/config/domain/advanced-options';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';
import { numberValue, textValue } from '@/features/config/ui/tabs/value-text';

/** Advanced tab (`configs/tabs/Advanced.vue`): FEC, quantization, threads, switches, codec modes, capture and encoder. */
export function AdvancedTab({ config, platform, update }: ConfigTabProps) {
  const captures = captureChoices(platform);

  return (
    <div className="flex flex-col gap-6" data-testid="config-advanced">
      <TextField
        id="fec_percentage"
        label="config.fec_percentage"
        desc="config.fec_percentage_desc"
        placeholder="20"
        value={textValue(config['fec_percentage'])}
        onChange={(value) => update('fec_percentage', value)}
      />
      <TextField
        id="qp"
        type="number"
        label="config.qp"
        desc="config.qp_desc"
        placeholder="28"
        value={textValue(config['qp'])}
        onChange={(value) => update('qp', numberValue(value))}
      />
      <TextField
        id="min_threads"
        type="number"
        min={1}
        label="config.min_threads"
        desc="config.min_threads_desc"
        placeholder="2"
        value={textValue(config['min_threads'])}
        onChange={(value) => update('min_threads', numberValue(value))}
      />
      <BooleanField
        id="limit_framerate"
        localePrefix="config"
        value={config['limit_framerate']}
        onChange={(value) => update('limit_framerate', value)}
        default="true"
      />
      <BooleanField
        id="envvar_compatibility_mode"
        localePrefix="config"
        value={config['envvar_compatibility_mode']}
        onChange={(value) => update('envvar_compatibility_mode', value)}
        default="false"
      />
      <BooleanField
        id="legacy_ordering"
        localePrefix="config"
        value={config['legacy_ordering']}
        onChange={(value) => update('legacy_ordering', value)}
        default="false"
      />
      <BooleanField
        id="ignore_encoder_probe_failure"
        localePrefix="config"
        value={config['ignore_encoder_probe_failure']}
        onChange={(value) => update('ignore_encoder_probe_failure', value)}
        default="false"
      />
      <SelectField
        id="hevc_mode"
        label="config.hevc_mode"
        desc="config.hevc_mode_desc"
        value={config['hevc_mode']}
        choices={HEVC_MODE_CHOICES}
        onChange={(value) => update('hevc_mode', value)}
      />
      <SelectField
        id="av1_mode"
        label="config.av1_mode"
        desc="config.av1_mode_desc"
        value={config['av1_mode']}
        choices={AV1_MODE_CHOICES}
        onChange={(value) => update('av1_mode', value)}
      />
      {platform !== 'macos' && (
        <SelectField
          id="capture"
          label="config.capture"
          desc="config.capture_desc"
          value={config['capture']}
          choices={captures}
          onChange={(value) => update('capture', value)}
        />
      )}
      <SelectField
        id="encoder"
        label="config.encoder"
        desc="config.encoder_desc"
        value={config['encoder']}
        choices={encoderChoices(platform)}
        onChange={(value) => update('encoder', value)}
      />
    </div>
  );
}
