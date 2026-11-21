import type { Platform } from '@/shared/kernel';
import type { SelectChoice } from './general-options';

/** `hevc_mode` / `av1_mode` choices: the legacy `<option value="0..3">` list (values are strings, like the server). */
function modeChoices(prefix: 'hevc_mode' | 'av1_mode'): SelectChoice[] {
  return [0, 1, 2, 3].map((mode) => ({ value: String(mode), label: `config.${prefix}_${mode}` }));
}

export const HEVC_MODE_CHOICES: readonly SelectChoice[] = modeChoices('hevc_mode');
export const AV1_MODE_CHOICES: readonly SelectChoice[] = modeChoices('av1_mode');

/**
 * `capture` choices of a platform (legacy `<select id="capture">`, autodetect first). Empty on macOS, where the field
 * is hidden. Labels that are product names are `raw`; the beta suffix is an i18n key.
 */
export function captureChoices(platform: Platform): SelectChoice[] {
  const autodetect: SelectChoice = { value: '', label: '_common.autodetect' };
  switch (platform) {
    case 'linux':
      return [
        autodetect,
        { value: 'nvfbc', label: 'NvFBC', raw: true },
        { value: 'wlr', label: 'wlroots', raw: true },
        { value: 'kms', label: 'KMS', raw: true },
        { value: 'x11', label: 'X11', raw: true },
      ];
    case 'windows':
      return [
        autodetect,
        { value: 'ddx', label: 'Desktop Duplication API', raw: true },
        { value: 'wgc', label: 'react_ui.capture_wgc' },
      ];
    case 'macos':
      return [];
  }
}

/**
 * `encoder` choices of a platform (legacy `<select id="encoder">`): autodetect, the platform encoders, then software
 * on every platform.
 */
export function encoderChoices(platform: Platform): SelectChoice[] {
  const autodetect: SelectChoice = { value: '', label: '_common.autodetect' };
  const software: SelectChoice = { value: 'software', label: 'config.encoder_software' };
  switch (platform) {
    case 'windows':
      return [
        autodetect,
        { value: 'nvenc', label: 'NVIDIA NVENC', raw: true },
        { value: 'quicksync', label: 'Intel QuickSync', raw: true },
        { value: 'amdvce', label: 'AMD AMF/VCE', raw: true },
        software,
      ];
    case 'linux':
      return [
        autodetect,
        { value: 'nvenc', label: 'NVIDIA NVENC', raw: true },
        { value: 'vaapi', label: 'VA-API', raw: true },
        software,
      ];
    case 'macos':
      return [autodetect, { value: 'videotoolbox', label: 'VideoToolbox', raw: true }, software];
  }
}
