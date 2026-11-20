import { createElement } from 'react';
import { createBrowserEnvironment, createPairingApi, createSessionHostStore } from './infrastructure/adapters';
import { PairingPage as PairingPageView } from './ui/PairingPage';
import { PairingSection as PairingSectionView } from './ui/PairingSection';

const pairing = createPairingApi();
const hostStore = createSessionHostStore();
const env = createBrowserEnvironment();

export interface PairingSectionProps {
  /** Called 1 s after a PIN pairing so the page can refresh its client list. */
  onPaired?: () => void;
}

/** OTP / PIN pairing wired to the host API, the session storage and the browser location. */
export function PairingSection({ onPaired }: PairingSectionProps) {
  return createElement(PairingSectionView, { pairing, hostStore, env, onPaired });
}

/** The PIN page (title + pairing section). */
export function PairingPage() {
  return createElement(PairingPageView, { pairing, hostStore, env });
}
