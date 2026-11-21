import { useTranslation } from 'react-i18next';
import { parseNumberInput, optionText } from '@/features/config/domain/av-options';
import {
  NVENC_INTRA_REFRESH_CHOICES,
  NVENC_PRESET_VALUES,
  NVENC_TWOPASS_CHOICES,
  NVENC_VBV_INCREASE_RANGE,
  nvencPresetSuffixKey,
} from '@/features/config/domain/encoder-options';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import { PlatformOnly } from '@/shared/ui';
import { OutsideLink, Section } from '@/features/config/ui/tabs/AudioVideo/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

/** NVIDIA NVENC tab (`nv`). */
export function NvencTab({ config, platform, update }: ConfigTabProps) {
  const { t } = useTranslation();
  const presetChoices = NVENC_PRESET_VALUES.map((value) => {
    const suffix = nvencPresetSuffixKey(value);
    return { value, label: suffix ? `P${value} ${t(suffix)}` : `P${value}`, raw: true };
  });

  return (
    <div className="flex flex-col gap-10" data-testid="nv-tab">
      <div className="flex flex-col gap-6">
        <SelectField
          id="nvenc_preset"
          label="config.nvenc_preset"
          desc="config.nvenc_preset_desc"
          value={config['nvenc_preset']}
          choices={presetChoices}
          onChange={(value) => update('nvenc_preset', value)}
        />
        <SelectField
          id="nvenc_twopass"
          label="config.nvenc_twopass"
          desc="config.nvenc_twopass_desc"
          value={config['nvenc_twopass']}
          choices={NVENC_TWOPASS_CHOICES}
          onChange={(value) => update('nvenc_twopass', value)}
        />
        <BooleanField
          id="nvenc_spatial_aq"
          localePrefix="config"
          value={config['nvenc_spatial_aq']}
          onChange={(value) => update('nvenc_spatial_aq', value)}
          default="false"
        />
        <TextField
          id="nvenc_vbv_increase"
          type="number"
          min={NVENC_VBV_INCREASE_RANGE.min}
          max={NVENC_VBV_INCREASE_RANGE.max}
          label="config.nvenc_vbv_increase"
          desc="config.nvenc_vbv_increase_desc"
          placeholder="0"
          value={optionText(config['nvenc_vbv_increase'])}
          onChange={(value) => update('nvenc_vbv_increase', parseNumberInput(value))}
        >
          <OutsideLink href="https://en.wikipedia.org/wiki/Video_buffering_verifier">VBV/HRD</OutsideLink>
        </TextField>
      </div>

      <Section id="nv-misc" title={t('config.misc')}>
        <PlatformOnly platform={platform} platforms={['windows']}>
          <BooleanField
            id="nvenc_realtime_hags"
            localePrefix="config"
            value={config['nvenc_realtime_hags']}
            onChange={(value) => update('nvenc_realtime_hags', value)}
            default="true"
          >
            <span className="mt-2 block">
              <OutsideLink href="https://devblogs.microsoft.com/directx/hardware-accelerated-gpu-scheduling/">
                HAGS
              </OutsideLink>
            </span>
          </BooleanField>
          <BooleanField
            id="nvenc_latency_over_power"
            localePrefix="config"
            value={config['nvenc_latency_over_power']}
            onChange={(value) => update('nvenc_latency_over_power', value)}
            default="true"
          />
          <BooleanField
            id="nvenc_opengl_vulkan_on_dxgi"
            localePrefix="config"
            value={config['nvenc_opengl_vulkan_on_dxgi']}
            onChange={(value) => update('nvenc_opengl_vulkan_on_dxgi', value)}
            default="true"
          />
        </PlatformOnly>
        <BooleanField
          id="nvenc_h264_cavlc"
          localePrefix="config"
          value={config['nvenc_h264_cavlc']}
          onChange={(value) => update('nvenc_h264_cavlc', value)}
          default="false"
        />
        {/* The legacy page gives this select the id of the CAVLC switch (`nvenc_h264_cavlc`); it has its own id here. */}
        <SelectField
          id="nvenc_intra_refresh"
          label="config.nvenc_intra_refresh"
          desc="config.nvenc_intra_refresh_desc"
          value={config['nvenc_intra_refresh']}
          choices={NVENC_INTRA_REFRESH_CHOICES}
          onChange={(value) => update('nvenc_intra_refresh', value)}
        />
      </Section>
    </div>
  );
}
