import { createElement } from 'react';
import { PairingSection } from '@/features/pairing';
import { createClientsApi } from './infrastructure/adapters';
import { PinPage as PinPageView } from './ui/PinPage';

const port = createClientsApi();

/** The PIN page: pairing forms and the paired-device management, wired to the host API. */
export function PinPage() {
  return createElement(PinPageView, {
    port,
    renderPairing: (onPaired) => createElement(PairingSection, { onPaired }),
  });
}
