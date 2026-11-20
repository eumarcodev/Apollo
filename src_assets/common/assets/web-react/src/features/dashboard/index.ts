import { createElement } from 'react';
import { createGithubReleases, createHostLog } from './infrastructure/adapters';
import { DashboardPage as DashboardPageView } from './ui/DashboardPage';

const releases = createGithubReleases();
const log = createHostLog();

/** Home page wired to the real adapters (GitHub releases, host log). */
export function DashboardPage() {
  return createElement(DashboardPageView, { releases, log });
}

export { ResourceCard } from './ui/ResourceCard';
