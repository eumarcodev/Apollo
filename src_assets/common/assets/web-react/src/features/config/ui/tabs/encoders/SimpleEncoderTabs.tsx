import { BooleanField, SelectField } from '@/features/config/ui/fields';
import {
  CODER_CHOICES,
  QSV_PRESET_CHOICES,
  SW_PRESET_CHOICES,
  SW_TUNE_CHOICES,
  VT_SOFTWARE_CHOICES,
} from '@/features/config/domain/encoder-options';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

/** Intel QuickSync tab (`qsv`). */
export function QsvTab({ config, update }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="qsv-tab">
      <SelectField
        id="qsv_preset"
        label="config.qsv_preset"
        value={config['qsv_preset']}
        choices={QSV_PRESET_CHOICES}
        onChange={(value) => update('qsv_preset', value)}
      />
      <SelectField
        id="qsv_coder"
        label="config.qsv_coder"
        value={config['qsv_coder']}
        choices={CODER_CHOICES}
        onChange={(value) => update('qsv_coder', value)}
      />
      <BooleanField
        id="qsv_slow_hevc"
        localePrefix="config"
        value={config['qsv_slow_hevc']}
        onChange={(value) => update('qsv_slow_hevc', value)}
        default="false"
      />
    </div>
  );
}

/** VideoToolbox tab (`vt`). */
export function VtTab({ config, update }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="vt-tab">
      <SelectField
        id="vt_coder"
        label="config.vt_coder"
        value={config['vt_coder']}
        choices={CODER_CHOICES}
        onChange={(value) => update('vt_coder', value)}
      />
      <SelectField
        id="vt_software"
        label="config.vt_software"
        value={config['vt_software']}
        choices={VT_SOFTWARE_CHOICES}
        onChange={(value) => update('vt_software', value)}
      />
      <BooleanField
        id="vt_realtime"
        desc=""
        localePrefix="config"
        value={config['vt_realtime']}
        onChange={(value) => update('vt_realtime', value)}
        default="true"
      />
    </div>
  );
}

/** VA-API tab (`vaapi`). */
export function VaapiTab({ config, update }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="vaapi-tab">
      <BooleanField
        id="vaapi_strict_rc_buffer"
        localePrefix="config"
        value={config['vaapi_strict_rc_buffer']}
        onChange={(value) => update('vaapi_strict_rc_buffer', value)}
        default="false"
      />
    </div>
  );
}

/** Software (x264/x265) tab (`sw`). */
export function SwTab({ config, update }: ConfigTabProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="sw-tab">
      <SelectField
        id="sw_preset"
        label="config.sw_preset"
        desc="config.sw_preset_desc"
        value={config['sw_preset']}
        choices={SW_PRESET_CHOICES}
        onChange={(value) => update('sw_preset', value)}
      />
      <SelectField
        id="sw_tune"
        label="config.sw_tune"
        desc="config.sw_tune_desc"
        value={config['sw_tune']}
        choices={SW_TUNE_CHOICES}
        onChange={(value) => update('sw_tune', value)}
      />
    </div>
  );
}
