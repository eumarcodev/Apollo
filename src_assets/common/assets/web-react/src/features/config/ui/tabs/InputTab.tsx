import { Separator } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { gamepadChoices, gamepadSectionTitleKey, inputVisibility } from '@/features/config/domain/input-options';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from './types';

/** Text of an option that the server sends as a number or a string (the field shows it as typed). */
const asText = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

/** Input tab (`input`): gamepad, keyboard and mouse options, with the legacy platform and dependency conditions. */
export function InputTab({ config, platform, update }: ConfigTabProps) {
  const { t } = useTranslation();
  const show = inputVisibility(
    {
      controller: config['controller'],
      gamepad: config['gamepad'],
      keyboard: config['keyboard'],
      mouse: config['mouse'],
    },
    platform,
  );

  return (
    <div className="flex flex-col gap-6" data-testid="config-input">
      <BooleanField
        id="controller"
        localePrefix="config"
        value={config['controller']}
        onChange={(value) => update('controller', value)}
        default="true"
      />

      {show.gamepadSelect ? (
        <SelectField
          id="gamepad"
          label="config.gamepad"
          desc="config.gamepad_desc"
          value={config['gamepad']}
          choices={gamepadChoices(platform)}
          onChange={(value) => update('gamepad', value)}
        />
      ) : null}

      {show.gamepadSection ? (
        <section
          aria-labelledby="gamepad-section-title"
          className="flex flex-col gap-6 rounded-lg border border-border p-4"
          data-testid="config-gamepad-section"
        >
          <h3 id="gamepad-section-title" className="helios-eyebrow">
            {t(gamepadSectionTitleKey(config['gamepad']))}
          </h3>
          {show.motionAndTouchpad ? (
            <>
              <BooleanField
                id="motion_as_ds4"
                localePrefix="config"
                value={config['motion_as_ds4']}
                onChange={(value) => update('motion_as_ds4', value)}
                default="true"
              />
              <BooleanField
                id="touchpad_as_ds4"
                localePrefix="config"
                value={config['touchpad_as_ds4']}
                onChange={(value) => update('touchpad_as_ds4', value)}
                default="true"
              />
            </>
          ) : null}
          {show.ds4BackAsTouchpadClick ? (
            <BooleanField
              id="ds4_back_as_touchpad_click"
              localePrefix="config"
              value={config['ds4_back_as_touchpad_click']}
              onChange={(value) => update('ds4_back_as_touchpad_click', value)}
              default="true"
            />
          ) : null}
          {show.ds5RandomizeMac ? (
            <BooleanField
              id="ds5_inputtino_randomize_mac"
              localePrefix="config"
              value={config['ds5_inputtino_randomize_mac']}
              onChange={(value) => update('ds5_inputtino_randomize_mac', value)}
              default="true"
            />
          ) : null}
        </section>
      ) : null}

      {show.backButtonTimeout ? (
        <TextField
          id="back_button_timeout"
          label="config.back_button_timeout"
          desc="config.back_button_timeout_desc"
          placeholder="-1"
          value={asText(config['back_button_timeout'])}
          onChange={(value) => update('back_button_timeout', value)}
        />
      ) : null}

      <Separator />
      <BooleanField
        id="keyboard"
        localePrefix="config"
        value={config['keyboard']}
        onChange={(value) => update('keyboard', value)}
        default="true"
      />
      {show.keyRepeat ? (
        <>
          <TextField
            id="key_repeat_delay"
            label="config.key_repeat_delay"
            desc="config.key_repeat_delay_desc"
            placeholder="500"
            value={asText(config['key_repeat_delay'])}
            onChange={(value) => update('key_repeat_delay', value)}
          />
          <TextField
            id="key_repeat_frequency"
            label="config.key_repeat_frequency"
            desc="config.key_repeat_frequency_desc"
            placeholder="24.9"
            value={asText(config['key_repeat_frequency'])}
            onChange={(value) => update('key_repeat_frequency', value)}
          />
        </>
      ) : null}
      {show.alwaysSendScancodes ? (
        <BooleanField
          id="always_send_scancodes"
          localePrefix="config"
          value={config['always_send_scancodes']}
          onChange={(value) => update('always_send_scancodes', value)}
          default="true"
        />
      ) : null}
      {show.rightAltToWin ? (
        <BooleanField
          id="key_rightalt_to_key_win"
          localePrefix="config"
          value={config['key_rightalt_to_key_win']}
          onChange={(value) => update('key_rightalt_to_key_win', value)}
          default="false"
        />
      ) : null}

      <Separator />
      <BooleanField
        id="mouse"
        localePrefix="config"
        value={config['mouse']}
        onChange={(value) => update('mouse', value)}
        default="true"
      />
      {show.highResolutionScrolling ? (
        <BooleanField
          id="high_resolution_scrolling"
          localePrefix="config"
          value={config['high_resolution_scrolling']}
          onChange={(value) => update('high_resolution_scrolling', value)}
          default="true"
        />
      ) : null}
      {show.nativePenTouch ? (
        <BooleanField
          id="native_pen_touch"
          localePrefix="config"
          value={config['native_pen_touch']}
          onChange={(value) => update('native_pen_touch', value)}
          default="true"
        />
      ) : null}

      <Separator />
      <BooleanField
        id="enable_input_only_mode"
        localePrefix="config"
        value={config['enable_input_only_mode']}
        onChange={(value) => update('enable_input_only_mode', value)}
        default="false"
      />

      {show.forwardRumble ? (
        <>
          <Separator />
          <BooleanField
            id="forward_rumble"
            localePrefix="config"
            value={config['forward_rumble']}
            onChange={(value) => update('forward_rumble', value)}
            default="true"
          />
        </>
      ) : null}
    </div>
  );
}
