/// <reference types="cypress" />
// Loaded before every spec in both modes. Helpers are imported explicitly by the specs
// (`./support/api` for stubbed specs, `./support/installed` for installed specs).

// Installed mode: the host may be configured in any language, but the specs assert English copy. Pin the UI
// language by answering `GET /api/configLocale` with `en`; the host config itself is never changed.
if (Cypress.spec.relative.endsWith('.installed.cy.ts')) {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/api/configLocale' }, { status: true, locale: 'en' });
  });
}

export {};
