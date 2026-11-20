export type NavItemId = 'home' | 'pin' | 'applications' | 'configuration' | 'password' | 'troubleshooting';

export interface NavItem {
  id: NavItemId;
  /** Relative link: pages are separate HTML documents, so navigating is a full page load. */
  href: string;
  /** Translation key of the label (same keys as the legacy navbar). */
  labelKey: string;
}

/** The authenticated pages, in the order of the legacy navbar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', href: './', labelKey: 'navbar.home' },
  { id: 'pin', href: './pin', labelKey: 'navbar.pin' },
  { id: 'applications', href: './apps', labelKey: 'navbar.applications' },
  { id: 'configuration', href: './config', labelKey: 'navbar.configuration' },
  { id: 'password', href: './password', labelKey: 'navbar.password' },
  { id: 'troubleshooting', href: './troubleshooting', labelKey: 'navbar.troubleshoot' },
];

function normalizePath(path: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (trimmed === '' || trimmed === '/index.html') {
    return '/';
  }
  // the static build serves `/config.html`; the Helios server serves the same page at `/config`
  return trimmed.replace(/\.html$/, '');
}

/**
 * The navigation item whose target is the page at `pathname`, or null (welcome, login, unknown paths).
 * `/` and `/index.html` are Home; a trailing slash is ignored, as the server routes do (`^/config/?$`).
 */
export function findActiveNavItem(pathname: string): NavItemId | null {
  const current = normalizePath(pathname);
  const match = NAV_ITEMS.find((item) => normalizePath(item.href.replace(/^\./, '')) === current);
  return match?.id ?? null;
}
