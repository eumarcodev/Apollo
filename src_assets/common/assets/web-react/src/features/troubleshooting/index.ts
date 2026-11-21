import { createElement } from 'react';
import { createLogsReader, createMaintenance } from './infrastructure/adapters';
import { TroubleshootingPage as TroubleshootingPageView } from './ui/TroubleshootingPage';

const maintenance = createMaintenance();
const logs = createLogsReader();

/** Troubleshooting page wired to the real adapters. */
export function TroubleshootingPage() {
  return createElement(TroubleshootingPageView, { maintenance, logs });
}
