import { describe, expect, it } from 'vitest';
import {
  AMD_RC_CHOICES,
  AMD_USAGE_CHOICES,
  CODER_CHOICES,
  NVENC_INTRA_REFRESH_CHOICES,
  NVENC_PRESET_VALUES,
  NVENC_TWOPASS_CHOICES,
  PYROWAVE_PRIORITY_CHOICES,
  QSV_PRESET_CHOICES,
  SW_PRESET_CHOICES,
  SW_TUNE_CHOICES,
  VT_SOFTWARE_CHOICES,
  nvencPresetSuffixKey,
} from './encoder-options';

const values = (choices: readonly { value: string }[]) => choices.map((choice) => choice.value);

describe('encoder option lists (legacy order and values)', () => {
  it('lists the NVENC presets and the suffix of P1 and P7 only', () => {
    expect(NVENC_PRESET_VALUES).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(nvencPresetSuffixKey('1')).toBe('config.nvenc_preset_1');
    expect(nvencPresetSuffixKey('4')).toBeNull();
    expect(nvencPresetSuffixKey('7')).toBe('config.nvenc_preset_7');
    expect(values(NVENC_TWOPASS_CHOICES)).toEqual(['disabled', 'quarter_res', 'full_res']);
  });

  it('shows the disabled intra refresh as automatic', () => {
    expect(NVENC_INTRA_REFRESH_CHOICES).toEqual([
      { value: 'disabled', label: '_common.auto' },
      { value: 'enabled', label: '_common.enabled' },
    ]);
  });

  it('lists QuickSync, AMF, PyroWave, VideoToolbox and software choices', () => {
    expect(values(QSV_PRESET_CHOICES)).toEqual(['veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'slowest']);
    expect(values(CODER_CHOICES)).toEqual(['auto', 'cabac', 'cavlc']);
    expect(values(AMD_USAGE_CHOICES)).toEqual([
      'transcoding',
      'webcam',
      'lowlatency_high_quality',
      'lowlatency',
      'ultralowlatency',
    ]);
    expect(values(AMD_RC_CHOICES)).toEqual(['cbr', 'cqp', 'vbr_latency', 'vbr_peak']);
    expect(values(PYROWAVE_PRIORITY_CHOICES)).toEqual(['low', 'medium', 'high', 'realtime']);
    expect(values(VT_SOFTWARE_CHOICES)).toEqual(['auto', 'disabled', 'allowed', 'forced']);
    expect(SW_PRESET_CHOICES).toHaveLength(9);
    expect(values(SW_TUNE_CHOICES)).toEqual(['film', 'animation', 'grain', 'stillimage', 'fastdecode', 'zerolatency']);
    expect(SW_TUNE_CHOICES[0]?.label).toBe('config.sw_tune_film');
  });
});
