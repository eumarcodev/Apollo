import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  automaticHostInfo,
  buildDeepLink,
  canSaveHost,
  isLocalHostname,
  type HostInfo,
} from '@/features/pairing/domain/host-address';
import { INITIAL_OTP_STATE, OTP_LIFETIME_MS, otpReducer, type OtpState } from '@/features/pairing/domain/otp-pairing';
import type { HostCache } from './host-cache';
import type { PageEnvironment, PairingPort } from './ports';

export interface OtpPairingDeps {
  pairing: PairingPort;
  env: PageEnvironment;
  hostCache: HostCache;
  /** Asks whether to open the deep link right away (only when the page is not opened on the host itself). */
  askPairNow: () => Promise<boolean>;
}

export interface OtpPairing {
  state: OtpState;
  pending: boolean;
  setPassphrase(value: string): void;
  setDeviceName(value: string): void;
  setHostAddr(value: string): void;
  setHostPort(value: string): void;
  submit(): Promise<void>;
  toggleHostEditing(): void;
  saveHost(): void;
}

/**
 * OTP pairing as on the legacy page: request an OTP, resolve the host of the deep link (typed by hand in this session,
 * else the reported address or the page hostname), forget the OTP after 3 minutes and, away from the host, offer to
 * open the deep link. The state lives as long as the OTP tab is mounted (a tab switch starts over).
 */
export function useOtpPairing({ pairing, env, hostCache, askPairNow }: OtpPairingDeps): OtpPairing {
  const [state, dispatch] = useReducer(otpReducer, INITIAL_OTP_STATE);
  const [pending, setPending] = useState(false);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpiry = useCallback(() => {
    if (expiry.current !== null) {
      clearTimeout(expiry.current);
      expiry.current = null;
    }
  }, []);

  useEffect(() => clearExpiry, [clearExpiry]);

  const submit = useCallback(async () => {
    if (state.editingHost) {
      return;
    }
    const { passphrase, deviceName } = state;
    setPending(true);
    let answer;
    try {
      answer = await pairing.requestOtp({ passphrase, deviceName });
    } catch (error) {
      // The legacy page shows nothing when the request itself fails; a 401 already went to the login page.
      console.error(error);
      return;
    } finally {
      setPending(false);
    }
    if (!answer.ok) {
      dispatch({ type: 'failed', message: answer.message });
      return;
    }

    const hostname = env.hostname();
    let host: HostInfo;
    if (hostCache.isManual) {
      host = hostCache.current ?? state.host;
    } else {
      host = automaticHostInfo({ reportedIp: answer.ip, pageHostname: hostname, pagePort: env.port() });
      hostCache.remember(host);
    }
    dispatch({ type: 'succeeded', otp: answer.otp, hostName: answer.hostName, host });
    if (!host.hostAddr) {
      return;
    }

    clearExpiry();
    expiry.current = setTimeout(() => {
      expiry.current = null;
      dispatch({ type: 'expired' });
    }, OTP_LIFETIME_MS);

    if (!isLocalHostname(hostname)) {
      const link = buildDeepLink({ ...host, otp: answer.otp, passphrase, hostName: answer.hostName });
      if (await askPairNow()) {
        env.openLink(link);
      }
    }
  }, [state, pairing, env, hostCache, askPairNow, clearExpiry]);

  const toggleHostEditing = useCallback(() => {
    dispatch({ type: 'hostEditingToggled', cached: hostCache.current });
  }, [hostCache]);

  const saveHost = useCallback(() => {
    if (!canSaveHost(state.host)) {
      return;
    }
    hostCache.saveManual(state.host);
    dispatch({ type: 'hostSaved' });
  }, [state.host, hostCache]);

  return {
    state,
    pending,
    setPassphrase: (value) => dispatch({ type: 'passphraseChanged', value }),
    setDeviceName: (value) => dispatch({ type: 'deviceNameChanged', value }),
    setHostAddr: (value) => dispatch({ type: 'hostAddrChanged', value }),
    setHostPort: (value) => dispatch({ type: 'hostPortChanged', value }),
    submit,
    toggleHostEditing,
    saveHost,
  };
}
