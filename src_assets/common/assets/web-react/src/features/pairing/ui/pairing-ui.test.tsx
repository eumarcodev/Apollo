import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostInfo } from '@/features/pairing/domain/host-address';
import { OTP_LIFETIME_MS } from '@/features/pairing/domain/otp-pairing';
import type { HostInfoStore, OtpAnswer, PageEnvironment, PairingPort } from '@/features/pairing/application/ports';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { PairingPage } from './PairingPage';

const OTP_OK: OtpAnswer = { ok: true, otp: '4321', ip: '10.0.0.5', hostName: 'Helios PC' };

interface Setup {
  hostname?: string;
  port?: string;
  hash?: string;
  stored?: HostInfo | null;
  sendPin?: PairingPort['sendPin'];
  requestOtp?: PairingPort['requestOtp'];
  onPaired?: () => void;
  locale?: 'en' | 'pt_BR';
}

async function setup({
  hostname = 'localhost',
  port = '47990',
  hash = '',
  stored = null,
  sendPin = vi.fn().mockResolvedValue(true),
  requestOtp = vi.fn().mockResolvedValue(OTP_OK),
  onPaired,
  locale = 'en',
}: Setup = {}) {
  const pairing: PairingPort = { sendPin: vi.fn(sendPin), requestOtp: vi.fn(requestOtp) };
  const hostStore: HostInfoStore = { load: vi.fn(() => stored), save: vi.fn() };
  const env: PageEnvironment = {
    hostname: () => hostname,
    port: () => port,
    hash: () => hash,
    setHash: vi.fn(),
    openLink: vi.fn(),
  };
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  await renderWithProviders(<PairingPage pairing={pairing} hostStore={hostStore} env={env} onPaired={onPaired} />, {
    i18n: await createTestI18n(locale),
  });
  return { pairing, hostStore, env, user };
}

async function requestOtp(user: ReturnType<typeof userEvent.setup>, passphrase = 'abcd', name = '') {
  await user.type(screen.getByTestId('otp-passphrase'), passphrase);
  if (name) {
    await user.type(screen.getByTestId('otp-device-name'), name);
  }
  await user.click(screen.getByTestId('otp-submit'));
}

// The tab indicator waits for its animations on a switch; jsdom has no Web Animations API.
const hadGetAnimations = 'getAnimations' in Element.prototype;
beforeAll(() => {
  if (!hadGetAnimations) {
    Element.prototype.getAnimations = () => [];
  }
});
afterAll(() => {
  if (!hadGetAnimations) {
    delete (Element.prototype as Partial<Element>).getAnimations;
  }
});

beforeEach(() => {
  // HeroUI Tabs measure their list with a ResizeObserver, which jsdom does not provide.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PairingPage: tabs', () => {
  it('opens the OTP tab by default with the placeholder code and both notices', async () => {
    await setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PIN');
    expect(screen.getByRole('tab', { name: 'OTP Pairing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('otp-code')).toHaveTextContent('????');
    expect(screen.queryByTestId('otp-qr')).toBeNull();
    expect(screen.queryByTestId('otp-link')).toBeNull();
    expect(screen.getByTestId('otp-info')).toHaveTextContent('only available for the latest Selene clients');
    expect(screen.getByTestId('pairing-warning')).toHaveTextContent('Warning!');
    expect(screen.getByTestId('pairing-warning')).toHaveTextContent('total control to your computer');
    expect(screen.getByTestId('otp-passphrase')).toHaveFocus();
  });

  it('opens the PIN tab from #PIN', async () => {
    await setup({ hash: '#PIN' });
    expect(screen.getByRole('tab', { name: 'PIN Pairing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('pin-input')).toHaveFocus();
    expect(screen.queryByTestId('otp-info')).toBeNull();
    expect(screen.getByTestId('pairing-warning')).toBeInTheDocument();
  });

  it('sets the hash and starts the OTP tab over on a switch', async () => {
    const { env, user } = await setup();
    await requestOtp(user);
    expect(await screen.findByTestId('otp-code')).toHaveTextContent('4321');
    await user.click(screen.getByRole('tab', { name: 'PIN Pairing' }));
    expect(env.setHash).toHaveBeenLastCalledWith('PIN');
    await user.click(screen.getByRole('tab', { name: 'OTP Pairing' }));
    expect(env.setHash).toHaveBeenLastCalledWith('OTP');
    expect(screen.getByTestId('otp-code')).toHaveTextContent('????');
    expect(screen.getByTestId('otp-passphrase')).toHaveValue('');
    expect(screen.queryByTestId('otp-message')).toBeNull();
  });

  it('stops the expiry timer of the previous OTP on a switch', async () => {
    const { user } = await setup();
    await requestOtp(user);
    await screen.findByTestId('otp-qr');
    await user.click(screen.getByRole('tab', { name: 'PIN Pairing' }));
    await user.click(screen.getByRole('tab', { name: 'OTP Pairing' }));
    act(() => {
      vi.advanceTimersByTime(OTP_LIFETIME_MS);
    });
    expect(screen.getByTestId('otp-code')).toHaveTextContent('????');
    expect(screen.queryByTestId('otp-message')).toBeNull();
  });
});

describe('PairingPage: PIN', () => {
  it('sends the PIN, confirms, clears the inputs, shows the permission notice and refreshes after 1 s', async () => {
    const onPaired = vi.fn();
    const { pairing, user } = await setup({ hash: '#PIN', onPaired });
    await user.type(screen.getByTestId('pin-input'), '1234');
    await user.type(screen.getByTestId('pin-device-name'), 'Tablet');
    await user.click(screen.getByTestId('pin-submit'));
    expect(pairing.sendPin).toHaveBeenCalledWith({ pin: '1234', name: 'Tablet' });
    expect(await screen.findByTestId('pin-status')).toHaveTextContent('Success! Please check Moonlight to continue');
    expect(screen.getByTestId('pin-status')).toHaveAttribute('data-status', 'success');
    expect(screen.getByTestId('pin-input')).toHaveValue('');
    expect(screen.getByTestId('pin-device-name')).toHaveValue('');
    const notice = await screen.findByTestId('paired-notice');
    expect(notice).toHaveTextContent('Please grant necessary permissions');
    expect(onPaired).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onPaired).toHaveBeenCalledTimes(1);
    await user.click(within(notice).getByTestId('paired-notice-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('paired-notice')).toBeNull());
  });

  it('works without an onPaired callback', async () => {
    const { user } = await setup({ hash: '#PIN' });
    await user.type(screen.getByTestId('pin-input'), '1');
    await user.click(screen.getByTestId('pin-submit'));
    await screen.findByTestId('paired-notice');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });

  it('reports a refused PIN and keeps the inputs', async () => {
    const { user } = await setup({ hash: '#PIN', sendPin: vi.fn().mockResolvedValue(false) });
    await user.type(screen.getByTestId('pin-input'), '9999');
    await user.click(screen.getByTestId('pin-submit'));
    const status = await screen.findByTestId('pin-status');
    expect(status).toHaveTextContent('Pairing Failed: Check if the PIN is typed correctly');
    expect(status).toHaveAttribute('data-status', 'failure');
    expect(screen.getByTestId('pin-input')).toHaveValue('9999');
    expect(screen.queryByTestId('paired-notice')).toBeNull();
  });

  it('clears the previous status on a new attempt and shows none when the request fails', async () => {
    const sendPin = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('offline'));
    const { user } = await setup({ hash: '#PIN', sendPin });
    await user.type(screen.getByTestId('pin-input'), '1');
    await user.click(screen.getByTestId('pin-submit'));
    await screen.findByTestId('pin-status');
    await user.click(screen.getByTestId('pin-submit'));
    await waitFor(() => expect(sendPin).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('pin-status')).toBeNull());
    expect(console.error).toHaveBeenCalled();
  });

  it('requires a PIN made of digits', async () => {
    const { pairing, user } = await setup({ hash: '#PIN' });
    await user.click(screen.getByTestId('pin-submit'));
    await user.type(screen.getByTestId('pin-input'), '12a');
    await user.click(screen.getByTestId('pin-submit'));
    expect(pairing.sendPin).not.toHaveBeenCalled();
  });
});

describe('PairingPage: OTP', () => {
  it('requests an OTP on this machine: reported address, port - 1, QR, link and no prompt', async () => {
    const { pairing, env, user } = await setup();
    await requestOtp(user, 'abcd', 'Tablet');
    expect(pairing.requestOtp).toHaveBeenCalledWith({ passphrase: 'abcd', deviceName: 'Tablet' });
    expect(await screen.findByTestId('otp-code')).toHaveTextContent('4321');
    const link = 'art://10.0.0.5:47989?pin=4321&passphrase=abcd&name=Helios%20PC';
    expect(screen.getByTestId('otp-qr')).toHaveAttribute('data-value', link);
    expect(screen.getByTestId('otp-qr').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('otp-link')).toHaveAttribute('href', link);
    expect(screen.getByTestId('otp-link')).toHaveTextContent('art://10.0.0.5:47989');
    expect(screen.getByTestId('otp-message')).toHaveTextContent('PIN request success');
    expect(screen.getByTestId('otp-message')).toHaveAttribute('data-status', 'success');
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(env.openLink).not.toHaveBeenCalled();
  });

  it('uses the page hostname away from the host and opens the deep link when the user accepts', async () => {
    const { env, user } = await setup({ hostname: 'helios.lan', port: '48000' });
    await requestOtp(user);
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(dialog).toHaveTextContent('PIN generated successfully, do you want to pair now?');
    await user.click(within(dialog).getByTestId('confirm-accept'));
    expect(env.openLink).toHaveBeenCalledWith('art://helios.lan:47999?pin=4321&passphrase=abcd&name=Helios%20PC');
  });

  it('does not open the deep link when the user declines', async () => {
    const { env, user } = await setup({ hostname: '192.168.1.20' });
    await requestOtp(user);
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByTestId('confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(env.openLink).not.toHaveBeenCalled();
    expect(screen.getByTestId('otp-link')).toHaveTextContent('art://192.168.1.20:47989');
  });

  it('shows the code without QR, timer or prompt when no address is known', async () => {
    const { user } = await setup({ requestOtp: vi.fn().mockResolvedValue({ ...OTP_OK, ip: '' }) });
    await requestOtp(user);
    expect(await screen.findByTestId('otp-code')).toHaveTextContent('4321');
    expect(screen.queryByTestId('otp-qr')).toBeNull();
    expect(screen.queryByTestId('host-edit')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(OTP_LIFETIME_MS);
    });
    expect(screen.getByTestId('otp-code')).toHaveTextContent('4321');
  });

  it('shows the refusal message, or nothing when the answer has none', async () => {
    const requestOtpMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: 'OTP already requested' })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('offline'));
    const { user } = await setup({ requestOtp: requestOtpMock });
    await requestOtp(user);
    const message = await screen.findByTestId('otp-message');
    expect(message).toHaveTextContent('OTP already requested');
    expect(message).toHaveAttribute('data-status', 'danger');
    await user.click(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(screen.queryByTestId('otp-message')).toBeNull());
    await user.click(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(requestOtpMock).toHaveBeenCalledTimes(3));
    expect(console.error).toHaveBeenCalled();
    expect(screen.getByTestId('otp-code')).toHaveTextContent('????');
  });

  it('requires a passphrase of at least 4 letters or digits', async () => {
    const { pairing, user } = await setup();
    await user.click(screen.getByTestId('otp-submit'));
    await requestOtp(user, 'ab1');
    await user.clear(screen.getByTestId('otp-passphrase'));
    await requestOtp(user, 'ab-12');
    expect(pairing.requestOtp).not.toHaveBeenCalled();
  });

  it('expires the OTP after 3 minutes and restarts the timer for a new one', async () => {
    const requestOtpMock = vi
      .fn()
      .mockResolvedValueOnce(OTP_OK)
      .mockResolvedValueOnce({ ...OTP_OK, otp: '8765' })
      .mockResolvedValueOnce({ ...OTP_OK, otp: '1111' });
    const { user } = await setup({ requestOtp: requestOtpMock });
    await requestOtp(user, 'abcd', 'Tablet');
    await screen.findByTestId('otp-qr');
    act(() => {
      vi.advanceTimersByTime(OTP_LIFETIME_MS - 60_000);
    });
    await user.click(screen.getByTestId('otp-submit'));
    expect(await screen.findByText('8765')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByTestId('otp-code')).toHaveTextContent('8765');
    act(() => {
      vi.advanceTimersByTime(OTP_LIFETIME_MS - 90_000);
    });
    expect(screen.getByTestId('otp-code')).toHaveTextContent('EXPIRED');
    expect(screen.getByTestId('otp-code')).toHaveAttribute('data-kind', 'expired');
    expect(screen.getByTestId('otp-message')).toHaveTextContent('OTP expired. Please request a new one.');
    expect(screen.getByTestId('otp-message')).toHaveAttribute('data-status', 'warning');
    expect(screen.getByTestId('otp-passphrase')).toHaveValue('');
    expect(screen.getByTestId('otp-device-name')).toHaveValue('');
    expect(screen.queryByTestId('otp-qr')).toBeNull();
    await requestOtp(user);
    expect(await screen.findByText('1111')).toBeInTheDocument();
  });
});

describe('PairingPage: host of the deep link', () => {
  it('uses the host typed earlier in this session instead of the reported address', async () => {
    const { user } = await setup({ stored: { hostAddr: 'pc.lan', hostPort: '50000' } });
    await requestOtp(user);
    expect(await screen.findByTestId('otp-link')).toHaveTextContent('art://pc.lan:50000');
    expect(screen.getByTestId('otp-qr')).toHaveAttribute(
      'data-value',
      'art://pc.lan:50000?pin=4321&passphrase=abcd&name=Helios%20PC',
    );
  });

  it('edits the host: save needs both fields, redraws the QR and stores the host for the session', async () => {
    const { hostStore, user } = await setup();
    await requestOtp(user);
    await user.click(await screen.findByTestId('host-edit'));
    expect(screen.queryByTestId('otp-form')).toBeNull();
    const addr = screen.getByTestId('host-addr');
    const port = screen.getByTestId('host-port');
    expect(addr).toHaveValue('10.0.0.5');
    expect(port).toHaveValue('47989');
    expect(addr).toHaveFocus();
    await user.clear(addr);
    expect(screen.getByTestId('host-save')).toBeDisabled();
    await user.type(addr, 'pc.lan');
    await user.clear(port);
    await user.type(port, '50000');
    expect(screen.getByTestId('otp-link')).toHaveTextContent('art://pc.lan:50000');
    expect(screen.getByTestId('otp-qr')).toHaveAttribute(
      'data-value',
      'art://10.0.0.5:47989?pin=4321&passphrase=abcd&name=Helios%20PC',
    );
    await user.click(screen.getByTestId('host-save'));
    expect(hostStore.save).toHaveBeenCalledWith({ hostAddr: 'pc.lan', hostPort: '50000' });
    expect(screen.queryByTestId('host-editor')).toBeNull();
    expect(screen.getByTestId('otp-qr')).toHaveAttribute(
      'data-value',
      'art://pc.lan:50000?pin=4321&passphrase=abcd&name=Helios%20PC',
    );
    // The next OTP keeps the host typed by hand.
    await user.click(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(screen.getByTestId('otp-link')).toHaveTextContent('art://pc.lan:50000'));
  });

  it('closing the editor without saving puts the kept host back', async () => {
    const { hostStore, user } = await setup();
    await requestOtp(user);
    await user.click(await screen.findByTestId('host-edit'));
    await user.clear(screen.getByTestId('host-addr'));
    await user.type(screen.getByTestId('host-addr'), 'other');
    await user.click(screen.getByTestId('host-edit'));
    expect(screen.getByTestId('otp-link')).toHaveTextContent('art://10.0.0.5:47989');
    expect(hostStore.save).not.toHaveBeenCalled();
  });

  it('keeps the legacy behaviour after a tab switch: a typed host is forgotten in memory, so no QR', async () => {
    const { user } = await setup({ stored: { hostAddr: 'pc.lan', hostPort: '50000' } });
    await user.click(screen.getByRole('tab', { name: 'PIN Pairing' }));
    await user.click(screen.getByRole('tab', { name: 'OTP Pairing' }));
    await requestOtp(user);
    expect(await screen.findByTestId('otp-code')).toHaveTextContent('4321');
    expect(screen.queryByTestId('otp-qr')).toBeNull();
  });
});

describe('PairingPage: translations', () => {
  it('renders in Portuguese', async () => {
    await setup({ locale: 'pt_BR' });
    expect(screen.getByRole('tab', { name: 'Pareamento por OTP' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pareamento por PIN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar PIN' })).toBeInTheDocument();
    expect(screen.getByTestId('pairing-warning')).toHaveTextContent('Atenção!');
  });
});
