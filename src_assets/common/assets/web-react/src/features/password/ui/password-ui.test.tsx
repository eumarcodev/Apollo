import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasswordPort } from '@/features/password/application/ports';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { PasswordPage } from './PasswordPage';

async function setup(change: PasswordPort['change'] = vi.fn().mockResolvedValue({ status: true }), reload = vi.fn()) {
  const view = await renderWithProviders(<PasswordPage port={{ change }} reload={reload} />);
  return { change, reload, view };
}

async function fill(values: Record<string, string>) {
  const user = userEvent.setup();
  for (const [id, value] of Object.entries(values)) {
    await user.type(screen.getByTestId(id), value);
  }
  return user;
}

const VALID = { currentUsername: 'x', newPassword: 'secret', confirmNewPassword: 'secret' };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('PasswordPage', () => {
  it('shows the title, the two credential groups and the fields with their autocomplete values', async () => {
    await setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Password Change');
    expect(screen.getByTestId('current-creds')).toHaveTextContent('Current Credentials');
    expect(screen.getByTestId('new-creds')).toHaveTextContent('New Credentials');
    expect(screen.getByText('If not specified, the username will not change')).toBeInTheDocument();
    expect(screen.getByTestId('currentUsername')).toBeRequired();
    expect(screen.getByTestId('currentPassword')).not.toBeRequired();
    expect(screen.getByTestId('currentPassword')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByTestId('currentPassword')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('newUsername')).not.toBeRequired();
    for (const id of ['newPassword', 'confirmNewPassword']) {
      expect(screen.getByTestId(id)).toBeRequired();
      expect(screen.getByTestId(id)).toHaveAttribute('autocomplete', 'new-password');
    }
    expect(screen.getByLabelText('Confirm Password')).toBe(screen.getByTestId('confirmNewPassword'));
    expect(screen.getByTestId('save')).toHaveTextContent('Save');
  });

  it('shows the mismatch error and sends no request', async () => {
    const { change } = await setup();
    const user = await fill({ currentUsername: 'x', newPassword: 'one', confirmNewPassword: 'two' });
    await user.click(screen.getByTestId('save'));
    expect(await screen.findByTestId('error')).toHaveTextContent('Password mismatch');
    expect(change).not.toHaveBeenCalled();
  });

  it('does not submit while a required field is empty', async () => {
    const { change } = await setup();
    const user = await fill({ newPassword: 'a', confirmNewPassword: 'a' });
    await user.click(screen.getByTestId('save'));
    expect(change).not.toHaveBeenCalled();
    expect(screen.queryByTestId('error')).toBeNull();
  });

  it('posts the five fields and shows the success message, then reloads after five seconds', async () => {
    const { change, reload } = await setup();
    const user = await fill({ ...VALID, currentPassword: 'old', newUsername: 'y' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await user.click(screen.getByTestId('save'));
      expect(await screen.findByTestId('success')).toHaveTextContent('Password has been changed successfully');
      expect(change).toHaveBeenCalledWith(
        {
          currentUsername: 'x',
          currentPassword: 'old',
          newUsername: 'y',
          newPassword: 'secret',
          confirmNewPassword: 'secret',
        },
        undefined,
      );
      expect(reload).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the error of a rejected change', async () => {
    await setup(vi.fn().mockResolvedValue({ status: false, error: 'Invalid Current Credentials' }));
    const user = await fill(VALID);
    await user.click(screen.getByTestId('save'));
    expect(await screen.findByTestId('error')).toHaveTextContent('Invalid Current Credentials');
    expect(screen.queryByTestId('success')).toBeNull();
  });

  it('shows Internal Server Error when the request fails', async () => {
    await setup(vi.fn().mockRejectedValue(new Error('HTTP 400')));
    const user = await fill(VALID);
    await user.click(screen.getByTestId('save'));
    expect(await screen.findByTestId('error')).toHaveTextContent('Internal Server Error');
  });

  it('clears the previous message when the form is submitted again', async () => {
    const change = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ status: true });
    await setup(change);
    const user = await fill(VALID);
    await user.click(screen.getByTestId('save'));
    await screen.findByTestId('error');
    await user.click(screen.getByTestId('save'));
    await waitFor(() => expect(screen.queryByTestId('error')).toBeNull());
    expect(await screen.findByTestId('success')).toBeInTheDocument();
  });

  it('is translated to pt_BR', async () => {
    const i18n = await createTestI18n('pt_BR');
    await renderWithProviders(<PasswordPage port={{ change: vi.fn() }} />, { i18n });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Alteração de senha');
    expect(screen.getByTestId('save')).toHaveTextContent('Salvar');
    const user = await fill({ currentUsername: 'x', newPassword: 'a', confirmNewPassword: 'b' });
    await user.click(screen.getByTestId('save'));
    expect(await screen.findByTestId('error')).toHaveTextContent('As senhas não coincidem');
  });
});
