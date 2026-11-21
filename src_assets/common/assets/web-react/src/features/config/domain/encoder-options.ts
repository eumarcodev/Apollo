import type { SelectChoice } from './general-options';

/** Choices of `<prefix>_<value>` i18n keys, in order. */
function prefixed(prefix: string, values: readonly string[]): SelectChoice[] {
  return values.map((value) => ({ value, label: `${prefix}_${value}` }));
}

/** `ffmpeg_auto` / `cabac` / `cavlc`: the coder select of QuickSync, AMF and VideoToolbox. */
export const CODER_CHOICES: readonly SelectChoice[] = [
  { value: 'auto', label: 'config.ffmpeg_auto' },
  { value: 'cabac', label: 'config.coder_cabac' },
  { value: 'cavlc', label: 'config.coder_cavlc' },
];

/** NVENC performance presets P1..P7 (value is the preset number as the legacy `<option value>` string). */
export const NVENC_PRESET_VALUES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7'];

/** Suffix key shown after `P<n>` (only the first and the last preset have one). */
export function nvencPresetSuffixKey(value: string): string | null {
  if (value === '1') {
    return 'config.nvenc_preset_1';
  }
  if (value === '7') {
    return 'config.nvenc_preset_7';
  }
  return null;
}

export const NVENC_TWOPASS_CHOICES = prefixed('config.nvenc_twopass', ['disabled', 'quarter_res', 'full_res']);

/** `nvenc_intra_refresh`: `disabled` is shown as "Automatic", as the legacy page does. */
export const NVENC_INTRA_REFRESH_CHOICES: readonly SelectChoice[] = [
  { value: 'disabled', label: '_common.auto' },
  { value: 'enabled', label: '_common.enabled' },
];

export const NVENC_VBV_INCREASE_RANGE = { min: 0, max: 400 } as const;

export const QSV_PRESET_CHOICES = prefixed('config.qsv_preset', [
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'slowest',
]);

export const AMD_USAGE_CHOICES = prefixed('config.amd_usage', [
  'transcoding',
  'webcam',
  'lowlatency_high_quality',
  'lowlatency',
  'ultralowlatency',
]);

export const AMD_RC_CHOICES = prefixed('config.amd_rc', ['cbr', 'cqp', 'vbr_latency', 'vbr_peak']);

export const AMD_QUALITY_CHOICES = prefixed('config.amd_quality', ['speed', 'balanced', 'quality']);

export const PYROWAVE_PRIORITY_CHOICES = prefixed('config.pyrowave_priority', ['low', 'medium', 'high', 'realtime']);

export const PYROWAVE_PACKET_SIZE_RANGE = { min: 400, max: 1300, placeholder: '1200' } as const;
export const PYROWAVE_MIN_FRAME_KB_RANGE = { min: 1, max: 4096, placeholder: '16' } as const;
export const PYROWAVE_SIMULATED_LOSS_RANGE = { min: 0, max: 100, step: 0.5, placeholder: '0' } as const;

export const VT_SOFTWARE_CHOICES: readonly SelectChoice[] = [
  { value: 'auto', label: '_common.auto' },
  { value: 'disabled', label: '_common.disabled' },
  { value: 'allowed', label: 'config.vt_software_allowed' },
  { value: 'forced', label: 'config.vt_software_forced' },
];

export const SW_PRESET_CHOICES = prefixed('config.sw_preset', [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
]);

export const SW_TUNE_CHOICES = prefixed('config.sw_tune', [
  'film',
  'animation',
  'grain',
  'stillimage',
  'fastdecode',
  'zerolatency',
]);
