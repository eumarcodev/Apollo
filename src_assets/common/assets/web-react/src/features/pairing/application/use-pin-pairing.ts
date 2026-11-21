import { useCallback, useState } from 'react';
import type { PairingPort, PinRequest } from './ports';

/** Delay before the page refreshes its client list after a PIN pairing (legacy page: 1 s). */
export const PAIRED_REFRESH_DELAY_MS = 1000;

export type PinStatus = 'success' | 'failure' | null;

export interface PinPairingDeps {
  pairing: PairingPort;
  /** Called 1 s after a successful pairing so the page can refresh the client list. */
  onPaired?: (() => void) | undefined;
  /** Tells the user to grant the new client its permissions (replaces the legacy `alert`). */
  notifyPaired: () => void;
}

export interface PinPairing {
  status: PinStatus;
  pending: boolean;
  /** Resolves true when the host accepted the PIN (the form then clears its inputs). */
  submit(request: PinRequest): Promise<boolean>;
}

/** PIN pairing (`POST ./api/pin`) with the success and failure states of the legacy page. */
export function usePinPairing({ pairing, onPaired, notifyPaired }: PinPairingDeps): PinPairing {
  const [status, setStatus] = useState<PinStatus>(null);
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (request: PinRequest) => {
      setStatus(null);
      setPending(true);
      let accepted: boolean;
      try {
        accepted = await pairing.sendPin(request);
      } catch (error) {
        // As on the legacy page, a request that fails outright shows no status; a 401 already went to the login page.
        console.error(error);
        return false;
      } finally {
        setPending(false);
      }
      if (!accepted) {
        setStatus('failure');
        return false;
      }
      setStatus('success');
      setTimeout(() => onPaired?.(), PAIRED_REFRESH_DELAY_MS);
      notifyPaired();
      return true;
    },
    [pairing, onPaired, notifyPaired],
  );

  return { status, pending, submit };
}
