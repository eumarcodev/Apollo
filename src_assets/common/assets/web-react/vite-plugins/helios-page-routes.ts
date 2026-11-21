import type { Connect, Plugin } from 'vite';

/** The 8 HTML entries served by the Helios web server (src/confighttp.cpp). */
export const PAGE_NAMES = [
  'index',
  'pin',
  'apps',
  'config',
  'password',
  'welcome',
  'login',
  'troubleshooting',
] as const;

export type PageName = (typeof PAGE_NAMES)[number];

const ROUTE_TO_PAGE: Readonly<Record<string, PageName>> = {
  '/': 'index',
  '/pin': 'pin',
  '/apps': 'apps',
  '/config': 'config',
  '/password': 'password',
  '/welcome': 'welcome',
  '/login': 'login',
  '/troubleshooting': 'troubleshooting',
};

/**
 * Map a request URL to its page HTML, the way the real server does (`^/config/?$` -> `config.html`).
 * The query string and the hash are kept. Returns null when the URL is not a page route.
 */
export function rewritePageUrl(url: string): string | null {
  const split = /^([^?#]*)(.*)$/s.exec(url);
  const path = split?.[1] ?? '';
  const rest = split?.[2] ?? '';
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  const page = ROUTE_TO_PAGE[normalized];
  return page ? `/${page}.html${rest}` : null;
}

export const pageRoutesMiddleware: Connect.NextHandleFunction = (req, _res, next) => {
  if (req.url) {
    const rewritten = rewritePageUrl(req.url);
    if (rewritten) {
      req.url = rewritten;
    }
  }
  next();
};

/** Vite plugin: page routes without `.html` for `vite dev` and `vite preview`, as on the real server. */
export function heliosPageRoutes(): Plugin {
  return {
    name: 'helios-page-routes',
    configureServer(server) {
      server.middlewares.use(pageRoutesMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(pageRoutesMiddleware);
    },
  };
}
