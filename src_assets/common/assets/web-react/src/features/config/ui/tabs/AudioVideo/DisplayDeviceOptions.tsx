import { Accordion, Alert, Button, Input, Label } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { optionText, parseNumberInput } from '@/features/config/domain/av-options';
import {
  DD_CONFIGURATION_CHOICES,
  DD_HDR_CHOICES,
  DD_REFRESH_RATE_CHOICES,
  DD_RESOLUTION_CHOICES,
  REMAPPING_COLUMN_LABELS,
  REMAPPING_PLACEHOLDERS,
  addRemappingRow,
  canBeRemapped,
  editRemappingRow,
  getRemappingType,
  isDisplayConfigured,
  remappingColumns,
  remappingHelpKeys,
  remappingRows,
  removeRemappingRow,
} from '@/features/config/domain/display-device';
import { BooleanField, SelectField, TextField } from '@/features/config/ui/fields';
import { PlatformOnly } from '@/shared/ui';
import { Section } from './fields';
import type { AvSectionProps } from './types';

function RemappingTable({ config, update }: Pick<AvSectionProps, 'config' | 'update'>) {
  const { t } = useTranslation();
  const type = getRemappingType(config);
  const columns = remappingColumns(type);
  const rows = remappingRows(config.dd_mode_remapping, type);

  return (
    <div className="flex flex-col gap-3" data-testid="dd-remapping" data-remapping-type={type}>
      <Label htmlFor="dd_mode_remapping">{t('config.dd_mode_remapping')}</Label>
      <div id="dd_mode_remapping" className="flex flex-col gap-1 text-sm text-muted">
        {remappingHelpKeys(type).map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
      </div>
      {rows.length > 0 && (
        <div role="table" className="flex flex-col gap-2">
          <div role="row" className="flex items-end gap-3 px-1 text-xs font-medium text-muted">
            {columns.map((column) => (
              <div role="columnheader" key={column} className="flex-1">
                {t(REMAPPING_COLUMN_LABELS[column])}
              </div>
            ))}
            <div role="columnheader" className="w-10" aria-hidden="true" />
          </div>
          {rows.map((row, index) => (
            <div role="row" key={index} className="flex items-center gap-3" data-testid={`dd-remapping-row-${index}`}>
              {columns.map((column) => (
                <div role="cell" key={column} className="flex-1">
                  <Input
                    aria-label={t(REMAPPING_COLUMN_LABELS[column])}
                    className="w-full font-mono"
                    data-testid={`dd-remapping-${index}-${column}`}
                    placeholder={REMAPPING_PLACEHOLDERS[column]}
                    value={optionText((row as Record<string, unknown>)[column])}
                    onChange={(event) =>
                      update(
                        'dd_mode_remapping',
                        editRemappingRow(config.dd_mode_remapping, type, index, column, event.target.value),
                      )
                    }
                  />
                </div>
              ))}
              <div role="cell" className="flex w-10 justify-end">
                <Button
                  isIconOnly
                  variant="danger"
                  size="sm"
                  aria-label={t('react_ui.remove_row')}
                  data-testid={`dd-remapping-remove-${index}`}
                  onPress={() => update('dd_mode_remapping', removeRemappingRow(config.dd_mode_remapping, type, index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        className="self-start"
        data-testid="dd-remapping-add"
        onPress={() => update('dd_mode_remapping', addRemappingRow(config.dd_mode_remapping, type))}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('config.dd_mode_remapping_add')}
      </Button>
    </div>
  );
}

/** Display device options: collapsed advanced section (Windows only) plus the HDR switch. */
export function DisplayDeviceOptions({ config, platform, update }: AvSectionProps) {
  const { t } = useTranslation();
  const configured = isDisplayConfigured(config);
  const resolution = config['dd_resolution_option'];
  const refreshRate = config['dd_refresh_rate_option'];

  return (
    <PlatformOnly platform={platform} platforms={['windows']}>
      <Section id="av-display-device" title={t('react_ui.av_section_display_device')}>
        <Accordion data-testid="dd-options">
          <Accordion.Item id="dd-options">
            <Accordion.Heading>
              <Accordion.Trigger>
                {t('config.dd_options_header')}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-6">
                <Alert status="accent">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {t('config.dd_resolution_option_vdisplay_desc')}{' '}
                      {t('config.dd_resolution_option_multi_instance_desc')}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>

                <SelectField
                  id="dd_configuration_option"
                  label="config.dd_configuration_option"
                  value={config['dd_configuration_option']}
                  choices={DD_CONFIGURATION_CHOICES}
                  onChange={(value) => update('dd_configuration_option', value)}
                />

                {configured && (
                  <>
                    <div className="flex flex-col gap-3">
                      <SelectField
                        id="dd_resolution_option"
                        label="config.dd_resolution_option"
                        desc={
                          resolution === 'auto' || resolution === 'manual'
                            ? 'config.dd_resolution_option_ogs_desc'
                            : undefined
                        }
                        value={resolution}
                        choices={DD_RESOLUTION_CHOICES}
                        onChange={(value) => update('dd_resolution_option', value)}
                      />
                      {resolution === 'manual' && (
                        <div className="pl-4">
                          <TextField
                            id="dd_manual_resolution"
                            label="config.dd_manual_resolution"
                            value={config['dd_manual_resolution']}
                            onChange={(value) => update('dd_manual_resolution', value)}
                            placeholder="2560x1440"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <SelectField
                        id="dd_refresh_rate_option"
                        label="config.dd_refresh_rate_option"
                        value={refreshRate}
                        choices={DD_REFRESH_RATE_CHOICES}
                        onChange={(value) => update('dd_refresh_rate_option', value)}
                      />
                      {refreshRate === 'manual' && (
                        <div className="pl-4">
                          <TextField
                            id="dd_manual_refresh_rate"
                            label="config.dd_manual_refresh_rate"
                            value={config['dd_manual_refresh_rate']}
                            onChange={(value) => update('dd_manual_refresh_rate', value)}
                            placeholder="59.9558"
                          />
                        </div>
                      )}
                    </div>

                    <TextField
                      id="dd_config_revert_delay"
                      type="number"
                      min={0}
                      label="config.dd_config_revert_delay"
                      value={optionText(config['dd_config_revert_delay'])}
                      onChange={(value) => update('dd_config_revert_delay', parseNumberInput(value))}
                      placeholder="3000"
                      desc="config.dd_config_revert_delay_desc"
                    />

                    <BooleanField
                      id="dd_config_revert_on_disconnect"
                      localePrefix="config"
                      value={config['dd_config_revert_on_disconnect']}
                      onChange={(value) => update('dd_config_revert_on_disconnect', value)}
                      default="false"
                    />
                  </>
                )}

                {canBeRemapped(config) && <RemappingTable config={config} update={update} />}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <SelectField
          id="dd_hdr_option"
          label="config.dd_hdr_option"
          value={config['dd_hdr_option']}
          choices={DD_HDR_CHOICES}
          onChange={(value) => update('dd_hdr_option', value)}
        />
      </Section>
    </PlatformOnly>
  );
}
