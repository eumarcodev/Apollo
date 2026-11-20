import { describe, expect, it } from 'vitest';
import {
  isValidFallbackModeInput,
  isVdisplayWarning,
  optionText,
  outputNamePlaceholder,
  parseNumberInput,
  vdisplayStatusName,
} from './av-options';

describe('isValidFallbackModeInput', () => {
  it.each(['1920x1080x60', '1920x1080x59.94', '1x1x1'])('accepts %s', (value) => {
    expect(isValidFallbackModeInput(value)).toBe(true);
  });

  it.each(['', '1920x1080', '1920x1080x', '1920x1080x60.', '1920x1080x.5', ' 1920x1080x60', '1920X1080X60'])(
    'rejects "%s"',
    (value) => {
      expect(isValidFallbackModeInput(value)).toBe(false);
    },
  );
});

describe('vdisplayStatusName', () => {
  it('maps every status of the driver, as a number or a string', () => {
    expect(vdisplayStatusName(1)).toBe('unknown');
    expect(vdisplayStatusName('0')).toBe('ready');
    expect(vdisplayStatusName(0)).toBe('ready');
    expect(vdisplayStatusName(-1)).toBe('uninitialized');
    expect(vdisplayStatusName('-2')).toBe('version_incompatible');
    expect(vdisplayStatusName(-3)).toBe('watchdog_failed');
  });

  it('has no name for a status the host never sends', () => {
    expect(vdisplayStatusName(7)).toBeNull();
    expect(vdisplayStatusName(undefined)).toBeNull();
    expect(vdisplayStatusName(null)).toBeNull();
  });
});

describe('isVdisplayWarning', () => {
  it('follows JavaScript truthiness (legacy quirk: the string "0" warns, the number 0 does not)', () => {
    expect(isVdisplayWarning(0)).toBe(false);
    expect(isVdisplayWarning(undefined)).toBe(false);
    expect(isVdisplayWarning('')).toBe(false);
    expect(isVdisplayWarning('0')).toBe(true);
    expect(isVdisplayWarning(1)).toBe(true);
    expect(isVdisplayWarning(-2)).toBe(true);
  });
});

describe('parseNumberInput', () => {
  it('turns numeric text into a number and keeps anything else as typed', () => {
    expect(parseNumberInput('120')).toBe(120);
    expect(parseNumberInput('0')).toBe(0);
    expect(parseNumberInput('')).toBe('');
    expect(parseNumberInput('-')).toBe('-');
  });
});

describe('optionText and outputNamePlaceholder', () => {
  it('shows missing values as empty text', () => {
    expect(optionText(undefined)).toBe('');
    expect(optionText(null)).toBe('');
    expect(optionText(0)).toBe('0');
    expect(optionText('abc')).toBe('abc');
  });

  it('uses the device id example on Windows and a display number elsewhere', () => {
    expect(outputNamePlaceholder('windows')).toBe('{de9bb7e2-186e-505b-9e93-f48793333810}');
    expect(outputNamePlaceholder('linux')).toBe('0');
    expect(outputNamePlaceholder('macos')).toBe('0');
  });
});
