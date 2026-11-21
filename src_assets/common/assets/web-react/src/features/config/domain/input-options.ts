import type { Platform } from '@/shared/kernel';
import type { SelectChoice } from './general-options';

/** Values of the options that decide which fields of the Input tab are shown (as the server sends them). */
export interface InputSettings {
  controller: unknown;
  gamepad: unknown;
  keyboard: unknown;
  mouse: unknown;
}

/**
 * Visibility of every field of the Input tab, from the legacy `Inputs.vue` conditions. Comparisons with `enabled`
 * are strict, like the legacy page. Platform rules use the `platform` reported by the host, never the hardware.
 */
export interface InputVisibility {
  gamepadSelect: boolean;
  /** Manual/automatic DS4 and DS5 section (its title depends on the gamepad type). */
  gamepadSection: boolean;
  /** Automatic detection: motion and touchpad as DS4/DS5 (Windows and Linux). */
  motionAndTouchpad: boolean;
  /** DS4 back button as touchpad click (DS4, or automatic on Windows). */
  ds4BackAsTouchpadClick: boolean;
  /** DS5 MAC randomization (DS5, or automatic on Linux). */
  ds5RandomizeMac: boolean;
  backButtonTimeout: boolean;
  keyRepeat: boolean;
  alwaysSendScancodes: boolean;
  rightAltToWin: boolean;
  highResolutionScrolling: boolean;
  nativePenTouch: boolean;
  forwardRumble: boolean;
}

/** Gamepad types offered by the select: automatic plus the ones of the host platform (legacy `PlatformLayout`). */
export function gamepadChoices(platform: Platform): SelectChoice[] {
  const choices: SelectChoice[] = [{ value: 'auto', label: '_common.auto' }];
  if (platform === 'linux') {
    choices.push(
      { value: 'ds5', label: 'config.gamepad_ds5' },
      { value: 'switch', label: 'config.gamepad_switch' },
      { value: 'xone', label: 'config.gamepad_xone' },
    );
  }
  if (platform === 'windows') {
    choices.push({ value: 'ds4', label: 'config.gamepad_ds4' }, { value: 'x360', label: 'config.gamepad_x360' });
  }
  return choices;
}

/** Title key of the gamepad section (legacy: DS4 options, DS5 options, or automatic options). */
export function gamepadSectionTitleKey(gamepad: unknown): string {
  if (gamepad === 'ds4') {
    return 'config.gamepad_ds4_manual';
  }
  if (gamepad === 'ds5') {
    return 'config.gamepad_ds5_manual';
  }
  return 'config.gamepad_auto';
}

export function inputVisibility(input: InputSettings, platform: Platform): InputVisibility {
  const controller = input.controller === 'enabled';
  const keyboard = input.keyboard === 'enabled';
  const mouse = input.mouse === 'enabled';
  const auto = input.gamepad === 'auto';
  const ds4 = input.gamepad === 'ds4';
  const ds5 = input.gamepad === 'ds5';
  const windows = platform === 'windows';
  const linux = platform === 'linux';
  const macos = platform === 'macos';
  return {
    gamepadSelect: controller && !macos,
    gamepadSection: controller && (ds4 || ds5 || (auto && !macos)),
    motionAndTouchpad: controller && auto && (windows || linux),
    ds4BackAsTouchpadClick: controller && (ds4 || (auto && windows)),
    ds5RandomizeMac: controller && (ds5 || (auto && linux)),
    backButtonTimeout: controller,
    keyRepeat: keyboard && windows,
    alwaysSendScancodes: keyboard && windows,
    rightAltToWin: keyboard,
    highResolutionScrolling: mouse,
    nativePenTouch: mouse,
    forwardRumble: windows,
  };
}
