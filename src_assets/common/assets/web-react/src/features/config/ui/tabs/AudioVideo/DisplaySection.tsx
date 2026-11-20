import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFallbackModeInput, optionText, parseNumberInput } from '@/features/config/domain/av-options';
import { BooleanField, PlatformOnly } from '@/shared/ui';
import { Section, SWITCH_CLASS, TextOptionField } from './fields';
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
      <TextOptionField
        id="max_bitrate"
        type="number"
        label={t('config.max_bitrate')}
        value={optionText(config['max_bitrate'])}
        onChange={(value) => update('max_bitrate', parseNumberInput(value))}
        placeholder="0"
        description={t('config.max_bitrate_desc')}
      />
      <TextOptionField
        id="minimum_fps_target"
        type="number"
        min={0}
        max={1000}
        label={t('config.minimum_fps_target')}
        value={optionText(config['minimum_fps_target'])}
        onChange={(value) => update('minimum_fps_target', parseNumberInput(value))}
        placeholder="0"
        description={t('config.minimum_fps_target_desc')}
      />
      <TextOptionField
        id="fallback_mode"
        label={t('config.fallback_mode')}
        value={fallbackMode}
        onChange={(value) => {
          setFallbackTouched(true);
          update('fallback_mode', value);
        }}
        placeholder="1920x1080x60"
        description={t('config.fallback_mode_desc')}
        error={fallbackInvalid ? t('config.fallback_mode_error') : undefined}
      />

      <PlatformOnly platform={platform} platforms={['windows']}>
        <BooleanField
          id="headless_mode"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['headless_mode']}
          onChange={(value) => update('headless_mode', value)}
          default="false"
        />
        <BooleanField
          id="double_refreshrate"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['double_refreshrate']}
          onChange={(value) => update('double_refreshrate', value)}
          default="false"
        />
        <BooleanField
          id="isolated_virtual_display_option"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['isolated_virtual_display_option']}
          onChange={(value) => update('isolated_virtual_display_option', value)}
          default="false"
        />
      </PlatformOnly>
    </Section>
  );
}
