import { createElement } from 'react';
import type { AppEntry } from './domain/app-entry';
import { launcherDownload, type LauncherHost } from './domain/launcher';
import { createAppsPort } from './infrastructure/adapters';
import { createAppsBrowser } from './infrastructure/browser';
import { AppsPage as AppsPageView } from './ui/AppsPage';

const port = createAppsPort();
const browser = createAppsBrowser();

/** Applications page wired to the real adapters. */
export function AppsPage() {
  return createElement(AppsPageView, { port, browser });
}

/** Download `<name>.art` for an app (also used by the editor). */
export function exportLauncherFile(host: LauncherHost, app: Pick<AppEntry, 'uuid' | 'name'>): void {
  browser.download(launcherDownload(host, app));
}

export type { AppEntry } from './domain/app-entry';
export type { LauncherHost } from './domain/launcher';
