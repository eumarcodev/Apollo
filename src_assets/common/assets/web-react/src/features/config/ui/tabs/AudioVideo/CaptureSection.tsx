import { useTranslation } from 'react-i18next';
import { optionText, outputNamePlaceholder } from '@/features/config/domain/av-options';
import { usePlatformTranslation } from '@/shared/i18n';
import type { Platform } from '@/shared/kernel';
import { CodeBlock, Section, TextOptionField } from './fields';
import type { AvSectionProps } from './types';

const VAINFO_COMMAND =
  'vainfo --display drm --device /dev/dri/renderD129 | \\\n' +
  '  grep -E "((VAProfileH264High|VAProfileHEVCMain|VAProfileHEVCMain10).*VAEntrypointEncSlice)|Driver version"';

function AdapterNameHelp({ platform }: { platform: Platform }) {
  const { t } = useTranslation();
  if (platform === 'windows') {
    return <CodeBlock>tools\dxgi-info.exe</CodeBlock>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm text-muted">
      <p>{t('config.adapter_name_desc_linux_1')}</p>
      <CodeBlock>{`ls /dev/dri/renderD*  # ${t('config.adapter_name_desc_linux_2')}`}</CodeBlock>
      <CodeBlock>{VAINFO_COMMAND}</CodeBlock>
      <p>{t('config.adapter_name_desc_linux_3')}</p>
      <p className="italic">VAProfileH264High : VAEntrypointEncSlice</p>
    </div>
  );
}

const OUTPUT_EXAMPLES: Record<Platform, string> = {
  windows: [
    '  {',
    '    "device_id": "{de9bb7e2-186e-505b-9e93-f48793333810}"',
    '    "display_name": "\\\\\\\\.\\\\DISPLAY1"',
    '    "friendly_name": "ROG PG279Q"',
    '    ...',
    '  }',
  ].join('\n'),
  linux: [
    'Info: Detecting displays',
    'Info: Detected display: DVI-D-0 (id: 0) connected: false',
    'Info: Detected display: HDMI-0 (id: 1) connected: true',
    'Info: Detected display: DP-0 (id: 2) connected: true',
    'Info: Detected display: DP-1 (id: 3) connected: false',
    'Info: Detected display: DVI-D-1 (id: 4) connected: false',
  ].join('\n'),
  macos: [
    'Info: Detecting displays',
    'Info: Detected display: Monitor-0 (id: 3) connected: true',
    'Info: Detected display: Monitor-1 (id: 2) connected: true',
  ].join('\n'),
};

/** GPU adapter (not on macOS) and captured display. */
export function CaptureSection({ config, platform, update }: AvSectionProps) {
  const { t } = useTranslation();
  const tp = usePlatformTranslation(platform);

  return (
    <Section id="av-capture" title={t('react_ui.av_section_capture')}>
      {platform !== 'macos' && (
        <TextOptionField
          id="adapter_name"
          label={t('config.adapter_name')}
          value={optionText(config['adapter_name'])}
          onChange={(value) => update('adapter_name', value)}
          placeholder={tp('config.adapter_name_placeholder', '/dev/dri/renderD128')}
          description={platform === 'windows' ? t('config.adapter_name_desc_windows') : undefined}
        >
          <AdapterNameHelp platform={platform} />
        </TextOptionField>
      )}

      <TextOptionField
        id="output_name"
        label={tp('config.output_name')}
        value={optionText(config['output_name'])}
        onChange={(value) => update('output_name', value)}
        placeholder={outputNamePlaceholder(platform)}
        description={tp('config.output_name_desc')}
      >
        <CodeBlock>{OUTPUT_EXAMPLES[platform]}</CodeBlock>
      </TextOptionField>
    </Section>
  );
}
