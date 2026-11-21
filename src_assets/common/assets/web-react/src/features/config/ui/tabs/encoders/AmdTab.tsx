import { useTranslation } from 'react-i18next';
import {
  AMD_QUALITY_CHOICES,
  AMD_RC_CHOICES,
  AMD_USAGE_CHOICES,
  CODER_CHOICES,
} from '@/features/config/domain/encoder-options';
import { BooleanField, SelectField } from '@/features/config/ui/fields';
import { Section } from '@/features/config/ui/tabs/AudioVideo/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

/** AMD AMF tab (`amd`). */
export function AmdTab({ config, update }: ConfigTabProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-10" data-testid="amd-tab">
      <SelectField
        id="amd_usage"
        label="config.amd_usage"
        desc="config.amd_usage_desc"
        value={config['amd_usage']}
        choices={AMD_USAGE_CHOICES}
        onChange={(value) => update('amd_usage', value)}
      />

      <Section id="amd-rc" title={t('config.amd_rc_group')}>
        <SelectField
          id="amd_rc"
          label="config.amd_rc"
          desc="config.amd_rc_desc"
          value={config['amd_rc']}
          choices={AMD_RC_CHOICES}
          onChange={(value) => update('amd_rc', value)}
        />
        <BooleanField
          id="amd_enforce_hrd"
          localePrefix="config"
          value={config['amd_enforce_hrd']}
          onChange={(value) => update('amd_enforce_hrd', value)}
          default="false"
        />
      </Section>

      <Section id="amd-quality" title={t('config.amd_quality_group')}>
        <SelectField
          id="amd_quality"
          label="config.amd_quality"
          desc="config.amd_quality_desc"
          value={config['amd_quality']}
          choices={AMD_QUALITY_CHOICES}
          onChange={(value) => update('amd_quality', value)}
        />
        <BooleanField
          id="amd_preanalysis"
          localePrefix="config"
          value={config['amd_preanalysis']}
          onChange={(value) => update('amd_preanalysis', value)}
          default="false"
        />
        <BooleanField
          id="amd_vbaq"
          localePrefix="config"
          value={config['amd_vbaq']}
          onChange={(value) => update('amd_vbaq', value)}
          default="true"
        />
        <SelectField
          id="amd_coder"
          label="config.amd_coder"
          desc="config.amd_coder_desc"
          value={config['amd_coder']}
          choices={CODER_CHOICES}
          onChange={(value) => update('amd_coder', value)}
        />
      </Section>
    </div>
  );
}
