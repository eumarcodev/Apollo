import { useTranslation } from 'react-i18next';
import { optionText } from '@/features/config/domain/av-options';
import { usePlatformTranslation } from '@/shared/i18n';
import { BooleanField, PlatformOnly } from '@/shared/ui';
import { CodeBlock, OutsideLink, Section, SWITCH_CLASS, TextOptionField } from './fields';
import type { AvSectionProps } from './types';

function AudioSinkHelp({ platform }: Pick<AvSectionProps, 'platform'>) {
  if (platform === 'windows') {
    return <CodeBlock>tools\audio-info.exe</CodeBlock>;
  }
  if (platform === 'linux') {
    return (
      <>
        <CodeBlock>{'pacmd list-sinks | grep "name:"'}</CodeBlock>
        <CodeBlock>pactl info | grep Source</CodeBlock>
      </>
    );
  }
  return (
    <p className="flex flex-col gap-1 text-sm">
      <OutsideLink href="https://github.com/mattingalls/Soundflower">Soundflower</OutsideLink>
      <span>
        <OutsideLink href="https://github.com/ExistentialAudio/BlackHole">BlackHole</OutsideLink>.
      </span>
    </p>
  );
}

/** Audio sink, virtual sink and the audio switches. */
export function AudioSection({ config, platform, update }: AvSectionProps) {
  const { t } = useTranslation();
  const tp = usePlatformTranslation(platform);

  return (
    <Section id="av-audio" title={t('react_ui.av_section_audio')}>
      <TextOptionField
        id="audio_sink"
        label={t('config.audio_sink')}
        value={optionText(config['audio_sink'])}
        onChange={(value) => update('audio_sink', value)}
        placeholder={tp('config.audio_sink_placeholder', 'alsa_output.pci-0000_09_00.3.analog-stereo')}
        description={tp('config.audio_sink_desc')}
      >
        <AudioSinkHelp platform={platform} />
      </TextOptionField>

      <PlatformOnly platform={platform} platforms={['windows']}>
        <TextOptionField
          id="virtual_sink"
          label={t('config.virtual_sink')}
          value={optionText(config['virtual_sink'])}
          onChange={(value) => update('virtual_sink', value)}
          placeholder={t('config.virtual_sink_placeholder')}
          description={t('config.virtual_sink_desc')}
        />
        <BooleanField
          id="install_steam_audio_drivers"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['install_steam_audio_drivers']}
          onChange={(value) => update('install_steam_audio_drivers', value)}
          default="true"
        />
        <BooleanField
          id="keep_sink_default"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['keep_sink_default']}
          onChange={(value) => update('keep_sink_default', value)}
          default="true"
        />
        <BooleanField
          id="auto_capture_sink"
          className={SWITCH_CLASS}
          localePrefix="config"
          value={config['auto_capture_sink']}
          onChange={(value) => update('auto_capture_sink', value)}
          default="true"
        />
      </PlatformOnly>

      <BooleanField
        id="stream_audio"
        className={SWITCH_CLASS}
        localePrefix="config"
        value={config['stream_audio']}
        onChange={(value) => update('stream_audio', value)}
        default="true"
      />
    </Section>
  );
}
