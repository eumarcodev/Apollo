import { describe, expect, it } from 'vitest';
import type { Platform } from '@/shared/kernel';
import { gamepadChoices, gamepadSectionTitleKey, inputVisibility, type InputSettings } from './input-options';

const DEFAULTS: InputSettings = { controller: 'enabled', gamepad: 'auto', keyboard: 'enabled', mouse: 'enabled' };

const visible = (platform: Platform, input: Partial<InputSettings> = {}) =>
  inputVisibility({ ...DEFAULTS, ...input }, platform);

describe('gamepadChoices', () => {
  it('offers automatic plus the DS4 and X360 types on Windows', () => {
    expect(gamepadChoices('windows').map((choice) => choice.value)).toEqual(['auto', 'ds4', 'x360']);
  });

  it('offers automatic plus the DS5, Switch and XOne types on Linux', () => {
    expect(gamepadChoices('linux').map((choice) => choice.value)).toEqual(['auto', 'ds5', 'switch', 'xone']);
  });

  it('offers automatic only on macOS', () => {
    expect(gamepadChoices('macos').map((choice) => choice.value)).toEqual(['auto']);
  });
});

describe('gamepadSectionTitleKey', () => {
  it('names the section after the gamepad type', () => {
    expect(gamepadSectionTitleKey('ds4')).toBe('config.gamepad_ds4_manual');
    expect(gamepadSectionTitleKey('ds5')).toBe('config.gamepad_ds5_manual');
    expect(gamepadSectionTitleKey('auto')).toBe('config.gamepad_auto');
    expect(gamepadSectionTitleKey('x360')).toBe('config.gamepad_auto');
  });
});

describe('inputVisibility', () => {
  it('shows the gamepad select everywhere but macOS, and only while the controller is enabled', () => {
    expect(visible('windows').gamepadSelect).toBe(true);
    expect(visible('linux').gamepadSelect).toBe(true);
    expect(visible('macos').gamepadSelect).toBe(false);
    expect(visible('windows', { controller: 'disabled' }).gamepadSelect).toBe(false);
  });

  it('shows the automatic section on Windows and Linux, but not on macOS', () => {
    expect(visible('windows').gamepadSection).toBe(true);
    expect(visible('linux').gamepadSection).toBe(true);
    expect(visible('macos').gamepadSection).toBe(false);
  });

  it('shows the DS4 and DS5 sections on macOS when that type is stored', () => {
    expect(visible('macos', { gamepad: 'ds4' }).gamepadSection).toBe(true);
    expect(visible('macos', { gamepad: 'ds5' }).gamepadSection).toBe(true);
  });

  it('hides the whole gamepad section while the controller is disabled', () => {
    const off = visible('windows', { controller: 'disabled' });
    expect(off.gamepadSection).toBe(false);
    expect(off.backButtonTimeout).toBe(false);
    expect(off.motionAndTouchpad).toBe(false);
    expect(off.ds4BackAsTouchpadClick).toBe(false);
    expect(off.ds5RandomizeMac).toBe(false);
  });

  it('shows motion and touchpad as DS4 only on automatic, on Windows and Linux', () => {
    expect(visible('windows').motionAndTouchpad).toBe(true);
    expect(visible('linux').motionAndTouchpad).toBe(true);
    expect(visible('macos').motionAndTouchpad).toBe(false);
    expect(visible('windows', { gamepad: 'ds4' }).motionAndTouchpad).toBe(false);
  });

  it('shows the DS4 back button option for DS4, or automatic on Windows only', () => {
    expect(visible('windows').ds4BackAsTouchpadClick).toBe(true);
    expect(visible('linux').ds4BackAsTouchpadClick).toBe(false);
    expect(visible('linux', { gamepad: 'ds4' }).ds4BackAsTouchpadClick).toBe(true);
    expect(visible('windows', { gamepad: 'ds5' }).ds4BackAsTouchpadClick).toBe(false);
  });

  it('shows the DS5 MAC option for DS5, or automatic on Linux only', () => {
    expect(visible('linux').ds5RandomizeMac).toBe(true);
    expect(visible('windows').ds5RandomizeMac).toBe(false);
    expect(visible('windows', { gamepad: 'ds5' }).ds5RandomizeMac).toBe(true);
  });

  it('keeps the back button timeout with the controller', () => {
    expect(visible('macos').backButtonTimeout).toBe(true);
  });

  it('shows the key repeat fields and scancodes on Windows with the keyboard enabled', () => {
    expect(visible('windows').keyRepeat).toBe(true);
    expect(visible('windows').alwaysSendScancodes).toBe(true);
    expect(visible('linux').keyRepeat).toBe(false);
    expect(visible('linux').alwaysSendScancodes).toBe(false);
    expect(visible('windows', { keyboard: 'disabled' }).keyRepeat).toBe(false);
  });

  it('shows the Right Alt mapping whenever the keyboard is enabled', () => {
    expect(visible('linux').rightAltToWin).toBe(true);
    expect(visible('linux', { keyboard: 'disabled' }).rightAltToWin).toBe(false);
  });

  it('shows high resolution scrolling and pen/touch only with the mouse enabled', () => {
    expect(visible('linux').highResolutionScrolling).toBe(true);
    expect(visible('linux').nativePenTouch).toBe(true);
    expect(visible('linux', { mouse: 'disabled' }).highResolutionScrolling).toBe(false);
    expect(visible('linux', { mouse: 'disabled' }).nativePenTouch).toBe(false);
  });

  it('shows rumble forwarding on Windows only', () => {
    expect(visible('windows').forwardRumble).toBe(true);
    expect(visible('linux').forwardRumble).toBe(false);
    expect(visible('macos').forwardRumble).toBe(false);
  });
});
