import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/testing';
import { BooleanField, type BooleanFieldProps } from './BooleanField';

function Controlled(
  props: Omit<BooleanFieldProps, 'value' | 'onChange'> & { initial: unknown; spy?: (v: unknown) => void },
) {
  const { initial, spy, ...rest } = props;
  const [value, setValue] = useState<unknown>(initial);
  return (
    <>
      <BooleanField
        {...rest}
        value={value}
        onChange={(next) => {
          spy?.(next);
          setValue(next);
        }}
      />
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

describe('BooleanField', () => {
  it('stacks label, default hint and description next to the control, and keeps a custom class', async () => {
    await renderWithProviders(
      <Controlled id="stream_audio" localePrefix="config" initial="enabled" default="true" className="extra" />,
    );
    const root = screen.getByRole('switch', { name: /Stream Audio/ }).closest('label, div');
    const content = document.querySelector('[data-slot="switch-content"]');
    expect(content).not.toBeNull();
    const rootClass = (content!.closest('[class*="flex-row"]') ?? root)!.className;
    expect(rootClass).toContain('flex-row');
    expect(rootClass).toContain('extra');
  });

  it('shows label and description from the locale prefix and id', async () => {
    await renderWithProviders(<Controlled id="stream_audio" localePrefix="config" initial="enabled" />);
    expect(screen.getByRole('switch', { name: /Stream Audio/ })).toBeChecked();
    expect(screen.getByText(/Whether to stream audio or not/)).toBeInTheDocument();
  });

  it('writes back the same representation', async () => {
    const spy = vi.fn();
    await renderWithProviders(<Controlled id="stream_audio" localePrefix="config" initial="disabled" spy={spy} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(spy).toHaveBeenLastCalledWith('enabled');
    expect(screen.getByTestId('value')).toHaveTextContent('enabled');
    await userEvent.click(toggle);
    expect(spy).toHaveBeenLastCalledWith('disabled');
  });

  it('supports inverse values', async () => {
    const spy = vi.fn();
    await renderWithProviders(
      <Controlled id="x" label="_common.enabled" desc="" inverseValues initial="true" spy={spy} />,
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(spy).toHaveBeenLastCalledWith('false');
  });

  it('shows the default hint', async () => {
    await renderWithProviders(<Controlled id="a" label="_common.enabled" desc="" default="true" initial={false} />);
    expect(screen.getByTestId('a-default')).toHaveTextContent('Default: checked');
  });

  it('shows the disabled default hint', async () => {
    await renderWithProviders(<Controlled id="b" label="_common.enabled" desc="" default="off" initial="on" />);
    expect(screen.getByTestId('b-default')).toHaveTextContent('Default: unchecked');
  });

  it('hides the description when desc is empty and shows children', async () => {
    const { rerender } = await renderWithProviders(
      <BooleanField id="c" label="_common.elevated" desc="" value={false} onChange={() => undefined} />,
    );
    expect(screen.queryByText('missing-prefix.c_desc')).not.toBeInTheDocument();
    rerender(
      <BooleanField id="c" label="_common.elevated" desc="" value={false} onChange={() => undefined}>
        <span>extra help</span>
      </BooleanField>,
    );
    expect(screen.getByText('extra help')).toBeInTheDocument();
  });

  it('logs unknown values and falls back to "true"/"false"', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spy = vi.fn();
    await renderWithProviders(<Controlled id="weird" label="_common.enabled" desc="" initial="maybe" spy={spy} />);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('did not match any acceptable pattern'));
    await userEvent.click(screen.getByRole('switch'));
    expect(spy).toHaveBeenLastCalledWith('true');
  });

  it('can be disabled', async () => {
    await renderWithProviders(
      <BooleanField id="d" label="_common.enabled" desc="" value isDisabled onChange={() => undefined} />,
    );
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
