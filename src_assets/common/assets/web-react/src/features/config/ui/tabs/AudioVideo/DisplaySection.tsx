import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFallbackModeInput, optionText, parseNumberInput } from '@/features/config/domain/av-options';
import { BooleanField, TextField } from '@/features/config/ui/fields';
import { PlatformOnly } from '@/shared/ui';
import { Section } from './fields';
import type { AvSectionProps } from './types';

/** Bitrate cap, minimum FPS, fallback mode and the Windows virtual display switches. */
export function DisplaySection({ config, platform, update }: AvSectionProps) {
  const { t } = useTranslation();
  // Legacy validates on `input` events only: nothing is flagged until the user types.
  const [fallbackTouched, setFallbackTouched] = useState(false);
  const fallbackMode = optionText(config['fallback_mode']);
  const fallbackInvalid = fallbackTouched && !isValidFallbackModeInput(fallbackMode);

  return (
    <Section id="av-display" title={t('react_ui.av_section_display')}>
      <TextField
        id="max_bitrate"
        type="number"
        label="config.max_bitrate"
        value={optionText(config['max_bitrate'])}
        onChange={(value) => update('max_bitrate', parseNumberInput(value))}
        placeholder="0"
        desc="config.max_bitrate_desc"
      />
      <TextField
        id="minimum_fps_target"
        type="number"
        min={0}
        max={1000}
        label="config.minimum_fps_target"
        value={optionText(config['minimum_fps_target'])}
        onChange={(value) => update('minimum_fps_target', parseNumberInput(value))}
        placeholder="0"
        desc="config.minimum_fps_target_desc"
      />
      <TextField
        id="fallback_mode"
        label="config.fallback_mode"
        value={fallbackMode}
        onChange={(value) => {
          setFallbackTouched(true);
          update('fallback_mode', value);
        }}
        placeholder="1920x1080x60"
        desc="config.fallback_mode_desc"
        error={fallbackInvalid ? 'config.fallback_mode_error' : undefined}
      />

      <PlatformOnly platform={platform} platforms={['windows']}>
        <BooleanField
          id="headless_mode"
          localePrefix="config"
          value={config['headless_mode']}
          onChange={(value) => update('headless_mode', value)}
          default="false"
        />
        <BooleanField
          id="double_refreshrate"
          localePrefix="config"
          value={config['double_refreshrate']}
          onChange={(value) => update('double_refreshrate', value)}
          default="false"
        />
        <BooleanField
          id="isolated_virtual_display_option"
          localePrefix="config"
          value={config['isolated_virtual_display_option']}
          onChange={(value) => update('isolated_virtual_display_option', value)}
          default="false"
        />
      </PlatformOnly>
    </Section>
  );
}
