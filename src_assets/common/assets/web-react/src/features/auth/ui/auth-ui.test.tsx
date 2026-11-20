import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthApiPort, BrowserPort, CreateCredentialsOutcome } from '@/features/auth/application/ports';
import type { LoginOutcome } from '@/features/auth/domain/login';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { LoginPage } from './LoginPage';
import { WelcomePage } from './WelcomePage';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function fakeApi(login: LoginOutcome = { kind: 'ok' }, create: CreateCredentialsOutcome = { kind: 'saved' }) {
  return {
    login: vi.fn<AuthApiPort['login']>().mockResolvedValue(login),
    createCredentials: vi.fn<AuthApiPort['createCredentials']>().mockResolvedValue(create),
  };
}

function fakeBrowser(search = '', hash = '') {
  return {
    search: () => search,
    hash: () => hash,
    assign: vi.fn<BrowserPort['assign']>(),
    reload: vi.fn<BrowserPort['reload']>(),
  };
}

function fakeStore(initial: string | null = null) {
  const store = {
    value: initial as string | null,
    read: () => store.value,
    write: vi.fn((value: string) => {
      store.value = value;
    }),
    remove: vi.fn(() => {
      store.value = null;
    }),
  };
  return store;
}

function Resources() {
  return <div data-testid="resources-slot" />;
}

describe('LoginPage', () => {
  it('shows the greeting, empty required fields and an unchecked remember box', async () => {
    await renderWithProviders(<LoginPage api={fakeApi()} savedLogin={fakeStore()} browser={fakeBrowser()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Helios!');
    const username = screen.getByLabelText(/Username/);
    expect(username).toHaveValue('');
    expect(username).toBeRequired();
    expect(username).toHaveAttribute('autocomplete', 'username');
    expect(username).toHaveFocus();
    expect(screen.getByLabelText(/^Password/)).toBeRequired();
    expect(screen.getByRole('checkbox', { name: 'Remember Password' })).not.toBeChecked();
  });

  it('prefills the saved credentials and checks the box', async () => {
    const store = fakeStore('{"username":"marco","password":"secret"}');
    await renderWithProviders(<LoginPage api={fakeApi()} savedLogin={store} browser={fakeBrowser()} />);
    expect(screen.getByLabelText(/Username/)).toHaveValue('marco');
    expect(screen.getByLabelText(/^Password/)).toHaveValue('secret');
    expect(screen.getByRole('checkbox', { name: 'Remember Password' })).toBeChecked();
  });

  it('ignores invalid saved JSON', async () => {
    await renderWithProviders(<LoginPage api={fakeApi()} savedLogin={fakeStore('{oops')} browser={fakeBrowser()} />);
    expect(screen.getByLabelText(/Username/)).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Remember Password' })).not.toBeChecked();
  });

  it('logs in, remembers the credentials and goes to the guarded redir with the hash', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const store = fakeStore();
    const browser = fakeBrowser('?redir=./config', '#general');
    await renderWithProviders(<LoginPage api={api} savedLogin={store} browser={browser} />);
    await user.type(screen.getByLabelText(/Username/), 'u');
    await user.type(screen.getByLabelText(/^Password/), 'p');
    await user.click(screen.getByRole('checkbox', { name: 'Remember Password' }));
    await user.click(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('auth-success')).toHaveTextContent('This page will reload soon.');
    expect(api.login).toHaveBeenCalledWith({ username: 'u', password: 'p' });
    expect(store.remove).not.toHaveBeenCalled();
    expect(store.value).toBe('{"username":"u","password":"p"}');
    expect(browser.assign).toHaveBeenCalledWith('./config#general');
  });

  it('forgets the saved credentials before posting when the box is unchecked', async () => {
    const user = userEvent.setup();
    const store = fakeStore('{"username":"u","password":"p"}');
    const api = fakeApi();
    const browser = fakeBrowser('?redir=https://evil.example', '#x');
    await renderWithProviders(<LoginPage api={api} savedLogin={store} browser={browser} />);
    await user.click(screen.getByRole('checkbox', { name: 'Remember Password' }));
    await user.click(screen.getByTestId('login-submit'));
    await waitFor(() => expect(browser.assign).toHaveBeenCalledWith('./#x'));
    expect(store.remove).toHaveBeenCalled();
    expect(store.remove.mock.invocationCallOrder[0]).toBeLessThan(api.login.mock.invocationCallOrder[0] ?? 0);
    expect(store.write).not.toHaveBeenCalled();
  });

  it.each<[LoginOutcome, string]>([
    [{ kind: 'unauthorized' }, 'Login failed: Please check your username and password'],
    [{ kind: 'http', status: 500 }, 'Login failed: Server returned 500'],
    [{ kind: 'network', reason: 'Failed to fetch' }, 'Login failed: Failed to fetch'],
  ])('shows the failure %o', async (outcome, message) => {
    const store = fakeStore('{"username":"u","password":"p"}');
    const browser = fakeBrowser();
    await renderWithProviders(<LoginPage api={fakeApi(outcome)} savedLogin={store} browser={browser} />);
    fireEvent.click(screen.getByTestId('login-submit'));
    const error = await screen.findByTestId('auth-error');
    expect(error).toHaveTextContent('Error!');
    expect(error).toHaveTextContent(message);
    expect(browser.assign).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('disables the button while the request runs', async () => {
    const pending = deferred<LoginOutcome>();
    const api = fakeApi();
    api.login.mockReturnValue(pending.promise);
    await renderWithProviders(
      <LoginPage api={api} savedLogin={fakeStore('{"username":"u","password":"p"}')} browser={fakeBrowser()} />,
    );
    fireEvent.click(screen.getByTestId('login-submit'));
    await waitFor(() => expect(screen.getByTestId('login-submit')).toBeDisabled());
    await act(async () => {
      pending.resolve({ kind: 'unauthorized' });
      await pending.promise;
    });
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('is translated in pt_BR', async () => {
    const i18n = await createTestI18n('pt_BR');
    await renderWithProviders(
      <LoginPage
        api={fakeApi({ kind: 'http', status: 503 })}
        savedLogin={fakeStore('{"username":"u","password":"p"}')}
        browser={fakeBrowser()}
      />,
      { i18n },
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bem-vindo ao Helios!');
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByTestId('auth-error')).toHaveTextContent('Falha no login: o servidor respondeu 503');
  });
});

describe('WelcomePage', () => {
  async function renderWelcome(api = fakeApi(), browser = fakeBrowser(), reloadDelayMs?: number) {
    const props = reloadDelayMs === undefined ? {} : { reloadDelayMs };
    await renderWithProviders(<WelcomePage api={api} browser={browser} resources={Resources} {...props} />);
    return { api, browser };
  }

  async function fill(newPassword: string, confirm: string) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Password/), newPassword);
    await user.type(screen.getByLabelText(/Confirm password/), confirm);
    await user.click(screen.getByTestId('welcome-submit'));
  }

  it('shows the greeting, the warning, the default username and the resources', async () => {
    await renderWelcome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Helios!');
    expect(screen.getByText(/Before Getting Started/)).toBeInTheDocument();
    expect(screen.getByTestId('create-creds-alert')).toHaveTextContent('Keep them safe');
    const username = screen.getByLabelText(/Username/);
    expect(username).toHaveValue('helios');
    expect(username).not.toBeRequired();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/^Password/)).toBeRequired();
    expect(screen.getByLabelText(/Confirm password/)).toBeRequired();
    expect(screen.getByTestId('resources-slot')).toBeInTheDocument();
  });

  it('shows the mismatch error and sends nothing', async () => {
    const { api } = await renderWelcome();
    await fill('abc', 'abd');
    expect(await screen.findByTestId('auth-error')).toHaveTextContent('Password mismatch');
    expect(api.createCredentials).not.toHaveBeenCalled();
  });

  it('posts the credentials and reloads after the delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { api, browser } = await renderWelcome();
      await fill('abc', 'abc');
      expect(await screen.findByTestId('auth-success')).toHaveTextContent(
        'This page will reload soon, your browser will ask you for the new credentials',
      );
      expect(api.createCredentials).toHaveBeenCalledWith({
        newUsername: 'helios',
        newPassword: 'abc',
        confirmNewPassword: 'abc',
      });
      act(() => {
        vi.advanceTimersByTime(4900);
      });
      expect(browser.reload).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(browser.reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reload after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const browser = fakeBrowser();
      const { unmount } = await renderWithProviders(
        <WelcomePage api={fakeApi()} browser={browser} resources={Resources} />,
      );
      await fill('abc', 'abc');
      await screen.findByTestId('auth-success');
      unmount();
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(browser.reload).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the edited username', async () => {
    const user = userEvent.setup();
    const { api } = await renderWelcome();
    await user.clear(screen.getByLabelText(/Username/));
    await user.type(screen.getByLabelText(/Username/), 'admin');
    await fill('x', 'x');
    await waitFor(() =>
      expect(api.createCredentials).toHaveBeenCalledWith({
        newUsername: 'admin',
        newPassword: 'x',
        confirmNewPassword: 'x',
      }),
    );
  });

  it.each<[CreateCredentialsOutcome, string | null]>([
    [{ kind: 'rejected', error: 'Invalid Username' }, 'Invalid Username'],
    [{ kind: 'server-error' }, 'Internal Server Error'],
    [{ kind: 'rejected', error: '' }, null],
  ])('shows the failure %o', async (outcome, message) => {
    const { browser } = await renderWelcome(fakeApi({ kind: 'ok' }, outcome), fakeBrowser(), 10);
    await fill('a', 'a');
    await waitFor(() => expect(screen.getByTestId('welcome-submit')).not.toBeDisabled());
    if (message === null) {
      expect(screen.queryByTestId('auth-error')).toBeNull();
    } else {
      expect(await screen.findByTestId('auth-error')).toHaveTextContent(message);
    }
    expect(screen.queryByTestId('auth-success')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(browser.reload).not.toHaveBeenCalled();
  });

  it('disables the button while the request runs', async () => {
    const pending = deferred<CreateCredentialsOutcome>();
    const api = fakeApi();
    api.createCredentials.mockReturnValue(pending.promise);
    await renderWelcome(api);
    await fill('a', 'a');
    await waitFor(() => expect(screen.getByTestId('welcome-submit')).toBeDisabled());
    await act(async () => {
      pending.resolve({ kind: 'server-error' });
      await pending.promise;
    });
    expect(screen.getByTestId('welcome-submit')).not.toBeDisabled();
  });
});
