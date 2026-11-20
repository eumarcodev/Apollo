import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Platform } from '@/shared/kernel';
import { renderWithProviders } from '@/shared/testing';
import { CommandListEditor, type CommandColumn } from './CommandListEditor';

type PrepCmd = { do: string; undo: string; elevated?: boolean };

const columns: CommandColumn<PrepCmd>[] = [
  { key: 'do', labelKey: '_common.do_cmd', kind: 'command' },
  { key: 'undo', labelKey: '_common.undo_cmd', kind: 'command' },
  {
    key: 'elevated',
    labelKey: '_common.run_as',
    kind: 'boolean',
    platforms: ['windows'],
    cellLabelKey: '_common.elevated',
    cellDefault: 'false',
  },
];

const createRow = (platform: Platform): PrepCmd =>
  platform === 'windows' ? { do: '', undo: '', elevated: false } : { do: '', undo: '' };

function Harness({
  platform,
  initial,
  spy,
}: {
  platform: Platform;
  initial: PrepCmd[];
  spy?: (rows: PrepCmd[]) => void;
}) {
  const [rows, setRows] = useState(initial);
  return (
    <CommandListEditor
      idPrefix="prep"
      rows={rows}
      onChange={(next) => {
        spy?.(next);
        setRows(next);
      }}
      columns={columns}
      platform={platform}
      createRow={createRow}
    />
  );
}

describe('CommandListEditor', () => {
  it('renders nothing but the add button when empty', async () => {
    await renderWithProviders(<Harness platform="windows" initial={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByTestId('prep-add')).toHaveTextContent('Add');
  });

  it('adds a row at the end with elevated=false on Windows', async () => {
    const spy = vi.fn();
    await renderWithProviders(
      <Harness platform="windows" initial={[{ do: 'a', undo: '', elevated: true }]} spy={spy} />,
    );
    await userEvent.click(screen.getByTestId('prep-add'));
    expect(spy).toHaveBeenLastCalledWith([
      { do: 'a', undo: '', elevated: true },
      { do: '', undo: '', elevated: false },
    ]);
    expect(screen.getAllByRole('switch')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: /Run as/ })).toBeInTheDocument();
  });

  it('hides the elevated column and value outside Windows', async () => {
    const spy = vi.fn();
    await renderWithProviders(<Harness platform="linux" initial={[{ do: 'x', undo: 'y' }]} spy={spy} />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Run as/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('prep-add'));
    expect(spy).toHaveBeenLastCalledWith([
      { do: 'x', undo: 'y' },
      { do: '', undo: '' },
    ]);
  });

  it('inserts at a row and removes a row', async () => {
    const spy = vi.fn();
    await renderWithProviders(
      <Harness
        platform="macos"
        initial={[
          { do: '1', undo: '' },
          { do: '2', undo: '' },
        ]}
        spy={spy}
      />,
    );
    await userEvent.click(screen.getByTestId('prep-insert-1'));
    expect(spy).toHaveBeenLastCalledWith([
      { do: '1', undo: '' },
      { do: '', undo: '' },
      { do: '2', undo: '' },
    ]);
    await userEvent.click(screen.getByTestId('prep-remove-0'));
    expect(spy).toHaveBeenLastCalledWith([
      { do: '', undo: '' },
      { do: '2', undo: '' },
    ]);
  });

  it('edits text and boolean cells', async () => {
    const spy = vi.fn();
    await renderWithProviders(
      <Harness platform="windows" initial={[{ do: '', undo: '', elevated: false }]} spy={spy} />,
    );
    const row = screen.getByTestId('prep-row-0');
    const doInput = within(row).getByRole('textbox', { name: 'Do Command' });
    expect(doInput).toHaveClass('font-mono');
    await userEvent.type(doInput, 'ab');
    expect(spy).toHaveBeenLastCalledWith([{ do: 'ab', undo: '', elevated: false }]);
    await userEvent.click(within(row).getByRole('switch', { name: /Elevated/ }));
    expect(spy).toHaveBeenLastCalledWith([{ do: 'ab', undo: '', elevated: true }]);
  });

  it('uses plain inputs for text columns and false for missing boolean values', async () => {
    type ServerCmd = { name: string; cmd: string; elevated?: boolean };
    const serverColumns: CommandColumn<ServerCmd>[] = [
      { key: 'name', labelKey: '_common.cmd_name', kind: 'text' },
      { key: 'cmd', labelKey: '_common.cmd_val', kind: 'command' },
      { key: 'elevated', labelKey: '_common.run_as', kind: 'boolean', platforms: ['windows'] },
    ];
    await renderWithProviders(
      <CommandListEditor
        idPrefix="server"
        rows={[{ name: 'n', cmd: 'c' }]}
        onChange={() => undefined}
        columns={serverColumns}
        platform="windows"
        createRow={() => ({ name: '', cmd: '' })}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Command Name' })).not.toHaveClass('font-mono');
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
});
