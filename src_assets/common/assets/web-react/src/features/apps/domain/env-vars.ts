import type { Platform } from '@/shared/kernel';

/** An environment variable every app command receives, with the translation key of its description. */
export interface EnvVar {
  name: string;
  descKey: string;
}

/** Same rows, in the same order, as the legacy reference table. */
export const APP_ENV_VARS: readonly EnvVar[] = [
  { name: 'HELIOS_APP_ID', descKey: 'apps.env_app_id' },
  { name: 'HELIOS_APP_NAME', descKey: 'apps.env_app_name' },
  { name: 'HELIOS_APP_UUID', descKey: 'apps.env_app_uuid' },
  { name: 'HELIOS_APP_STATUS', descKey: 'apps.env_app_status' },
  { name: 'HELIOS_CLIENT_UUID', descKey: 'apps.env_client_uuid' },
  { name: 'HELIOS_CLIENT_NAME', descKey: 'apps.env_client_name' },
  { name: 'HELIOS_CLIENT_WIDTH', descKey: 'apps.env_client_width' },
  { name: 'HELIOS_CLIENT_HEIGHT', descKey: 'apps.env_client_height' },
  { name: 'HELIOS_CLIENT_FPS', descKey: 'apps.env_client_fps' },
  { name: 'HELIOS_CLIENT_HDR', descKey: 'apps.env_client_hdr' },
  { name: 'HELIOS_CLIENT_GCMAP', descKey: 'apps.env_client_gcmap' },
  { name: 'HELIOS_CLIENT_HOST_AUDIO', descKey: 'apps.env_client_host_audio' },
  { name: 'HELIOS_CLIENT_ENABLE_SOPS', descKey: 'apps.env_client_enable_sops' },
  { name: 'HELIOS_CLIENT_AUDIO_CONFIGURATION', descKey: 'apps.env_client_audio_config' },
];

export interface EnvExample {
  labelKey: string;
  command: string;
}

const ENV_EXAMPLES: Record<Platform, EnvExample> = {
  windows: {
    labelKey: 'apps.env_rtss_cli_example',
    command: 'cmd /C \\path\\to\\rtss-cli.exe limit:set %HELIOS_CLIENT_FPS%',
  },
  linux: {
    labelKey: 'apps.env_xrandr_example',
    command:
      'sh -c "xrandr --output HDMI-1 --mode \\"${HELIOS_CLIENT_WIDTH}x${HELIOS_CLIENT_HEIGHT}\\" --rate ${HELIOS_CLIENT_FPS}"',
  },
  macos: {
    labelKey: 'apps.env_displayplacer_example',
    command:
      'sh -c "displayplacer "id:<screenId> res:${HELIOS_CLIENT_WIDTH}x${HELIOS_CLIENT_HEIGHT} hz:${HELIOS_CLIENT_FPS} scaling:on origin:(0,0) degree:0""',
  },
};

/** The platform example under the table (none while the platform is unknown). */
export function envExample(platform: Platform | null): EnvExample | null {
  return platform ? ENV_EXAMPLES[platform] : null;
}

/** "See more" link of the reference: the app examples of this repository. */
export const APP_EXAMPLES_URL = 'https://github.com/eumarcodev/Helios-Server/blob/master/docs/app_examples.md';
