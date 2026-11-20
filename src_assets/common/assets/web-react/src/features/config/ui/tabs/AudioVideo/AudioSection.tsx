import { useTranslation } from 'react-i18next';
import { usePlatformTranslation } from '@/shared/i18n';
import { PlatformOnly } from '@/shared/ui';
import { BooleanField, TextField } from '@/features/config/ui/fields';
import { CodeBlock, OutsideLink, Section, usePlatformKey } from './fields';
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
  const pk = usePlatformKey(platform);

  return (
    <Section id="av-audio" title={t('react_ui.av_section_audio')}>
      <TextField
        id="audio_sink"
        label="config.audio_sink"
        value={config['audio_sink']}
        onChange={(value) => update('audio_sink', value)}
        placeholder={tp('config.audio_sink_placeholder', 'alsa_output.pci-0000_09_00.3.analog-stereo')}
        desc={pk('config.audio_sink_desc')}
      >
        <AudioSinkHelp platform={platform} />
      </TextField>

      <PlatformOnly platform={platform} platforms={['windows']}>
        <TextField
          id="virtual_sink"
          label="config.virtual_sink"
          value={config['virtual_sink']}
          onChange={(value) => update('virtual_sink', value)}
          placeholder={t('config.virtual_sink_placeholder')}
          desc="config.virtual_sink_desc"
        />
        <BooleanField
          id="install_steam_audio_drivers"
          localePrefix="config"
          value={config['install_steam_audio_drivers']}
          onChange={(value) => update('install_steam_audio_drivers', value)}
          default="true"
        />
        <BooleanField
          id="keep_sink_default"
          localePrefix="config"
          value={config['keep_sink_default']}
          onChange={(value) => update('keep_sink_default', value)}
          default="true"
        />
        <BooleanField
          id="auto_capture_sink"
          localePrefix="config"
          value={config['auto_capture_sink']}
          onChange={(value) => update('auto_capture_sink', value)}
          default="true"
        />
      </PlatformOnly>

      <BooleanField
        id="stream_audio"
        localePrefix="config"
        value={config['stream_audio']}
        onChange={(value) => update('stream_audio', value)}
        default="true"
      />
    </Section>
  );
}
