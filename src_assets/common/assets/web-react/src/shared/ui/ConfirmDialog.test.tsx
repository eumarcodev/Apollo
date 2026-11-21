import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/testing';
import { ConfirmDialog, useConfirm } from './ConfirmDialog';

function Asker({ onResult }: { onResult: (accepted: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() => void confirm({ title: 'Quit?', body: 'Really quit', status: 'danger' }).then(onResult)}
    >
      ask
    </button>
  );
}

describe('ConfirmDialog', () => {
  it('renders title, body and default labels, and calls onConfirm', async () => {
    const onConfirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog isOpen={open} onOpenChange={setOpen} title="Delete?" body="Gone forever" onConfirm={onConfirm} />
      );
    }
    await renderWithProviders(<Harness />);
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('Gone forever')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-cancel')).toHaveTextContent('Cancel');
    await userEvent.click(screen.getByTestId('confirm-accept'));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Delete?')).not.toBeInTheDocument());
  });

  it('calls onCancel', async () => {
    const onCancel = vi.fn();
    await renderWithProviders(
      <ConfirmDialog
        isOpen
        onOpenChange={() => undefined}
        title="T"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() => undefined}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('useConfirm', () => {
  it('resolves true when accepted', async () => {
    const onResult = vi.fn();
    await renderWithProviders(<Asker onResult={onResult} />);
    await userEvent.click(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByText('Really quit')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirm-accept'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false when cancelled', async () => {
    const onResult = vi.fn();
    await renderWithProviders(<Asker onResult={onResult} />);
    await userEvent.click(screen.getByRole('button', { name: 'ask' }));
    await userEvent.click(screen.getByTestId('confirm-cancel'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('answers false to a pending request replaced by a new one', async () => {
    const results: boolean[] = [];
    function Double() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => {
            void confirm({ title: 'first' }).then((r) => results.push(r));
            void confirm({ title: 'second' }).then((r) => results.push(r));
          }}
        >
          twice
        </button>
      );
    }
    await renderWithProviders(<Double />);
    await userEvent.click(screen.getByRole('button', { name: 'twice' }));
    await waitFor(() => expect(results).toEqual([false]));
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Asker onResult={() => undefined} />)).toThrow(/ConfirmProvider/);
  });
});
