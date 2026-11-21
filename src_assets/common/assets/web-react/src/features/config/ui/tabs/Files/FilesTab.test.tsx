import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigModel } from '@/features/config/domain/config-model';
import { parseLoadedConfig, serializeConfig } from '@/features/config/domain/config-model';
import { visibleTabs } from '@/features/config/domain/config-tabs';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { FilesTab } from './FilesTab';

function load(platform: Platform, dto: Record<string, unknown> = {}): ConfigModel {
  return parseLoadedConfig({ status: true, platform, ...dto }, platform, visibleTabs(platform)).config;
}

function Harness({ initial, onModel }: { initial: ConfigModel; onModel: (m: ConfigModel) => void }) {
  const [config, setConfig] = useState(initial);
  return (
    <FilesTab
      config={config}
      platform="linux"
      vdisplayStatus={0}
      update={(key, value) => {
        const next = { ...config, [key]: value } as ConfigModel;
        setConfig(next);
        onModel(next);
      }}
    />
  );
}

async function renderTab(dto: Record<string, unknown> = {}, locale: 'en' | 'pt_BR' = 'en') {
  const models: ConfigModel[] = [];
  const i18n = await createTestI18n(locale);
  const user = userEvent.setup();
  const view = await renderWithProviders(<Harness initial={load('linux', dto)} onModel={(m) => models.push(m)} />, {
    i18n,
  });
  return { ...view, user, last: () => models[models.length - 1] };
}

const FIELDS: ReadonlyArray<[id: string, placeholder: string]> = [
  ['file_apps', 'apps.json'],
  ['credentials_file', 'sunshine_state.json'],
  ['log_path', 'sunshine.log'],
  ['pkey', '/dir/pkey.pem'],
  ['cert', '/dir/cert.pem'],
  ['file_state', 'sunshine_state.json'],
];

describe('FilesTab', () => {
  it('renders the six path fields with their option keys as DOM ids and legacy placeholders', async () => {
    await renderTab();
    for (const [id, placeholder] of FIELDS) {
      const input = document.getElementById(id) as HTMLInputElement;
      expect(input, id).not.toBeNull();
      expect(input, id).toHaveAttribute('placeholder', placeholder);
      expect(input.value, id).toBe('');
    }
  });

  it('shows the loaded paths and writes the edited value to its option', async () => {
    const { user, last } = await renderTab({ log_path: '/var/log/helios.log' });
    expect(document.getElementById('log_path')).toHaveValue('/var/log/helios.log');
    const cert = document.getElementById('cert') as HTMLElement;
    await user.type(cert, '/certs/c.pem');
    expect(last()?.['cert']).toBe('/certs/c.pem');
  });

  it('leaves the defaults out of the saved body', async () => {
    const { user, last } = await renderTab();
    await user.type(document.getElementById('pkey') as HTMLElement, 'k');
    const payload = serializeConfig(last() as ConfigModel, undefined, visibleTabs('linux')).payload;
    expect(payload['pkey']).toBe('k');
    expect(payload['file_apps']).toBeUndefined();
  });

  it('translates the labels to pt_BR', async () => {
    await renderTab({}, 'pt_BR');
    expect(screen.getByRole('textbox', { name: 'Arquivo de aplicativos' })).toBeInTheDocument();
  });

  it('renders without console errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderTab();
    expect(error).not.toHaveBeenCalled();
  });
});
