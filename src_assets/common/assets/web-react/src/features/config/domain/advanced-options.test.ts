import { describe, expect, it } from 'vitest';
import { AV1_MODE_CHOICES, captureChoices, encoderChoices, HEVC_MODE_CHOICES } from './advanced-options';

describe('advanced options', () => {
  it('lists the codec modes 0 to 3 as strings, like the legacy options', () => {
    expect(HEVC_MODE_CHOICES.map((choice) => choice.value)).toEqual(['0', '1', '2', '3']);
    expect(AV1_MODE_CHOICES.map((choice) => choice.label)).toEqual([
      'config.av1_mode_0',
      'config.av1_mode_1',
      'config.av1_mode_2',
      'config.av1_mode_3',
    ]);
  });

  it('offers no capture method on macOS', () => {
    expect(captureChoices('macos')).toEqual([]);
  });

  it('offers the Windows and Linux capture methods after autodetect', () => {
    expect(captureChoices('windows').map((choice) => choice.value)).toEqual(['', 'ddx', 'wgc']);
    expect(captureChoices('linux').map((choice) => choice.value)).toEqual(['', 'nvfbc', 'wlr', 'kms', 'x11']);
  });

  it('offers the platform encoders and software, in the legacy order', () => {
    expect(encoderChoices('windows').map((choice) => choice.value)).toEqual([
      '',
      'nvenc',
      'quicksync',
      'amdvce',
      'software',
    ]);
    expect(encoderChoices('linux').map((choice) => choice.value)).toEqual(['', 'nvenc', 'vaapi', 'software']);
    expect(encoderChoices('macos').map((choice) => choice.value)).toEqual(['', 'videotoolbox', 'software']);
  });
});
