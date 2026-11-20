/// <reference types="cypress" />
import type { StaticResponse } from 'cypress/types/net-stubbing';

export type StubPlatform = 'windows' | 'linux' | 'macos';
export type StubLocale = 'en' | 'pt_BR';

export interface StubServerApiOptions {
  platform?: StubPlatform;
  locale?: StubLocale;
  /** Extra or replacing responses keyed by `"<METHOD> <pathname>"`, e.g. `"GET /api/apps"`. */
  overrides?: Record<string, StaticResponse>;
}

/**
 * Stub every `/api/*` call with synthetic data shaped like the real handlers (src/confighttp.cpp).
 * Unstubbed API calls answer 501 so a missing stub fails loudly instead of hitting a real host.
 */
export function stubServerApi({ platform = 'windows', locale = 'en', overrides = {} }: StubServerApiOptions = {}) {
  cy.intercept({ pathname: /^\/api\// }, { statusCode: 501, body: { status: false, error: 'not stubbed in e2e' } }).as(
    'unstubbedApi',
  );
  cy.intercept(
    { method: 'GET', pathname: '/api/configLocale' },
    { statusCode: 200, body: { status: true, locale } },
  ).as('configLocale');
  cy.fixture('config.json').then((config: Record<string, unknown>) => {
    cy.intercept(
      { method: 'GET', pathname: '/api/config' },
      {
        statusCode: 200,
        body: { ...config, platform, locale, ...(platform === 'windows' ? {} : { vdisplayStatus: undefined }) },
      },
    ).as('config');
  });
  // The home page reads the host log and checks GitHub for updates: nothing leaves the machine in e2e.
  cy.intercept({ method: 'GET', pathname: '/api/logs' }, { statusCode: 200, body: '' }).as('logs');
  cy.intercept({ method: 'GET', url: 'https://api.github.com/repos/**' }, { statusCode: 200, body: [] }).as('releases');
  for (const [route, response] of Object.entries(overrides)) {
    const [method, pathname] = route.split(' ');
    cy.intercept({ method, pathname }, response);
  }
}
