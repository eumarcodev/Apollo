import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CoversPort } from '@/features/apps/application/ports';
import type { CoverCandidate } from '@/features/apps/domain/cover-finder';
import { newAppDraft } from '@/features/apps/domain/app-entry';
import { buildServerConfigDto, createTestI18n, jsonResponse, renderWithProviders } from '@/shared/testing';
import { AppEditor } from './AppEditor';
import { CoverFinder } from './CoverFinder';

const DOOM: CoverCandidate = { name: 'Doom', key: 'igdb_1', url: 'https://x/1.jpg', saveUrl: 'https://x/1.png' };
const ETERNAL: CoverCandidate = {
  name: 'Doom Eternal',
  key: 'igdb_2',
  url: 'https://x/2.jpg',
  saveUrl: 'https://x/2.png',
};

function fakeCovers(overrides: Partial<CoversPort> = {}): CoversPort {
  return {
    search: vi.fn(() => Promise.resolve([DOOM, ETERNAL])),
    upload: vi.fn(() => Promise.resolve('C:/covers/igdb_1.png')),
    ...overrides,
  };
}

async function show(port: CoversPort, locale: 'en' | 'pt_BR' = 'en') {
  const user = userEvent.setup();
  const onPath = vi.fn();
  await renderWithProviders(<CoverFinder port={port} name="  Doom " onPath={onPath} />, {
    i18n: await createTestI18n(locale),
  });
  return { user, onPath };
}

describe('CoverFinder', () => {
  it('searches by the trimmed name and lists the covers with their names', async () => {
    const port = fakeCovers();
    const { user } = await show(port);
    await user.click(screen.getByTestId('cover-finder-open'));
    expect(await screen.findByTestId('cover-igdb_1')).toHaveTextContent('Doom');
    expect(screen.getByTestId('cover-igdb_2')).toHaveTextContent('Doom Eternal');
    expect(screen.getByText('Covers Found')).toBeInTheDocument();
    expect(port.search).toHaveBeenCalledWith('Doom', expect.any(AbortSignal));
  });

  it('shows the loading state until the search ends', async () => {
    let finish: (list: CoverCandidate[]) => void = () => undefined;
    const port = fakeCovers({ search: vi.fn(() => new Promise<CoverCandidate[]>((resolve) => (finish = resolve))) });
    const { user } = await show(port);
    await user.click(screen.getByTestId('cover-finder-open'));
    expect(await screen.findByTestId('cover-finder-loading')).toHaveTextContent('Loading...');
    finish([]);
    expect(await screen.findByTestId('cover-finder-empty')).toHaveTextContent('No covers found for this name.');
    expect(screen.queryByTestId('cover-finder-loading')).not.toBeInTheDocument();
  });

  it('shows the error state when the search fails', async () => {
    const { user } = await show(fakeCovers({ search: vi.fn(() => Promise.reject(new Error('down'))) }));
    await user.click(screen.getByTestId('cover-finder-open'));
    expect(await screen.findByTestId('cover-finder-error')).toHaveTextContent('The cover search failed');
  });

  it('downloads the picked cover through the host, reports its path and closes', async () => {
    const port = fakeCovers();
    const { user, onPath } = await show(port);
    await user.click(screen.getByTestId('cover-finder-open'));
    await user.click(await screen.findByTestId('cover-igdb_1'));
    await waitFor(() => expect(onPath).toHaveBeenCalledWith('C:/covers/igdb_1.png'));
    expect(port.upload).toHaveBeenCalledWith(DOOM);
    await waitFor(() => expect(screen.queryByTestId('cover-finder-dialog')).not.toBeInTheDocument());
  });

  it('locks the grid while the host downloads the cover', async () => {
    let finish: (path: string) => void = () => undefined;
    const port = fakeCovers({ upload: vi.fn(() => new Promise<string>((resolve) => (finish = resolve))) });
    const { user, onPath } = await show(port);
    await user.click(screen.getByTestId('cover-finder-open'));
    await user.click(await screen.findByTestId('cover-igdb_1'));
    await waitFor(() => expect(screen.getByTestId('cover-igdb_2')).toBeDisabled());
    finish('C:/c.png');
    await waitFor(() => expect(onPath).toHaveBeenCalledWith('C:/c.png'));
  });

  it('keeps the popup open and shows the reason when the download fails', async () => {
    const port = fakeCovers({ upload: vi.fn(() => Promise.reject(new Error('Failed to download cover'))) });
    const { user, onPath } = await show(port);
    await user.click(screen.getByTestId('cover-finder-open'));
    await user.click(await screen.findByTestId('cover-igdb_1'));
    expect(await screen.findByTestId('cover-finder-pick-error')).toHaveTextContent(
      'Could not download the cover: Failed to download cover',
    );
    expect(onPath).not.toHaveBeenCalled();
    expect(screen.getByTestId('cover-igdb_2')).toBeEnabled();
  });

  it('closes with the close button', async () => {
    const { user } = await show(fakeCovers());
    await user.click(screen.getByTestId('cover-finder-open'));
    await user.click(await screen.findByTestId('cover-finder-close'));
    await waitFor(() => expect(screen.queryByTestId('cover-finder-dialog')).not.toBeInTheDocument());
  });

  it('is translated', async () => {
    const { user } = await show(fakeCovers(), 'pt_BR');
    expect(screen.getByTestId('cover-finder-open')).toHaveTextContent('Buscar capa (online)');
    await user.click(screen.getByTestId('cover-finder-open'));
    expect(await screen.findByText('Capas encontradas')).toBeInTheDocument();
  });
});

describe('CoverFinder in the editor', () => {
  it('searches by the name being typed and fills the image path with the picked cover', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(jsonResponse(buildServerConfigDto())));
    const port = fakeCovers();
    const user = userEvent.setup();
    await renderWithProviders(
      <AppEditor
        initial={newAppDraft()}
        platform="windows"
        busy={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onExport={vi.fn()}
        nameAddon={({ name, setImagePath }) => <CoverFinder port={port} name={name} onPath={setImagePath} />}
      />,
      { i18n: await createTestI18n('en') },
    );
    await user.clear(screen.getByTestId('appName'));
    await user.paste('Doom');
    await user.click(screen.getByTestId('cover-finder-open'));
    await user.click(await screen.findByTestId('cover-igdb_1'));
    await waitFor(() => expect(screen.getByTestId('appImagePath')).toHaveValue('C:/covers/igdb_1.png'));
    expect(port.search).toHaveBeenCalledWith('Doom', expect.any(AbortSignal));
  });
});
