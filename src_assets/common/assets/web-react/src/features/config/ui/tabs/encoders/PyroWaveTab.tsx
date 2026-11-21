import { Alert } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { optionText, parseNumberInput } from '@/features/config/domain/av-options';
import {
  PYROWAVE_MIN_FRAME_KB_RANGE,
  PYROWAVE_PACKET_SIZE_RANGE,
  PYROWAVE_PRIORITY_CHOICES,
  PYROWAVE_SIMULATED_LOSS_RANGE,
} from '@/features/config/domain/encoder-options';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

/** PyroWave tab (`pyrowave`). */
export function PyroWaveTab({ config, update }: ConfigTabProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6" data-testid="pyrowave-tab">
      <Alert status="warning" data-testid="pyrowave-note">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{t('config.pyrowave_tab_note')}</Alert.Description>
        </Alert.Content>
      </Alert>

      <BooleanField
        id="pyrowave"
        localePrefix="config"
        value={config['pyrowave']}
        onChange={(value) => update('pyrowave', value)}
        default="true"
      />
      <TextField
        id="pyrowave_packet_size"
        type="number"
        min={PYROWAVE_PACKET_SIZE_RANGE.min}
        max={PYROWAVE_PACKET_SIZE_RANGE.max}
        placeholder={PYROWAVE_PACKET_SIZE_RANGE.placeholder}
        label="config.pyrowave_packet_size"
        desc="config.pyrowave_packet_size_desc"
        value={optionText(config['pyrowave_packet_size'])}
        onChange={(value) => update('pyrowave_packet_size', parseNumberInput(value))}
      />
      <TextField
        id="pyrowave_min_frame_kb"
        type="number"
        min={PYROWAVE_MIN_FRAME_KB_RANGE.min}
        max={PYROWAVE_MIN_FRAME_KB_RANGE.max}
        placeholder={PYROWAVE_MIN_FRAME_KB_RANGE.placeholder}
        label="config.pyrowave_min_frame_kb"
        desc="config.pyrowave_min_frame_kb_desc"
        value={optionText(config['pyrowave_min_frame_kb'])}
        onChange={(value) => update('pyrowave_min_frame_kb', parseNumberInput(value))}
      />
      <BooleanField
        id="pyrowave_static_boost"
        localePrefix="config"
        value={config['pyrowave_static_boost']}
        onChange={(value) => update('pyrowave_static_boost', value)}
        default="true"
      />
      <SelectField
        id="pyrowave_priority"
        label="config.pyrowave_priority"
        desc="config.pyrowave_priority_desc"
        value={config['pyrowave_priority']}
        choices={PYROWAVE_PRIORITY_CHOICES}
        onChange={(value) => update('pyrowave_priority', value)}
      />
      <TextField
        id="pyrowave_simulated_loss"
        type="number"
        min={PYROWAVE_SIMULATED_LOSS_RANGE.min}
        max={PYROWAVE_SIMULATED_LOSS_RANGE.max}
        step={PYROWAVE_SIMULATED_LOSS_RANGE.step}
        placeholder={PYROWAVE_SIMULATED_LOSS_RANGE.placeholder}
        label="config.pyrowave_simulated_loss"
        desc="config.pyrowave_simulated_loss_desc"
        value={optionText(config['pyrowave_simulated_loss'])}
        onChange={(value) => update('pyrowave_simulated_loss', parseNumberInput(value))}
      />
    </div>
  );
}
