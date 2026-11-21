/// <reference types="cypress" />

/** Options that `GET /api/config` returns but that are not part of the config file. */
const METADATA_KEYS = new Set(['status', 'platform', 'version', 'update_repo', 'vdisplayStatus']);

export type ConfigSnapshot = Record<string, unknown>;

/** Log in to the installed host once per spec run (`POST /api/login` sets the `auth` cookie). */
export function loginInstalled() {
  cy.session(
    'helios-installed',
    () => {
      // Credentials come from cypress.env.json (git-ignored); cy.env keeps them out of the command log.
      cy.env(['HELIOS_USERNAME', 'HELIOS_PASSWORD'], { log: false }).then((env) => {
        const username = env['HELIOS_USERNAME'] as string | undefined;
        const password = env['HELIOS_PASSWORD'] as string | undefined;
        if (!username || !password) {
          throw new Error(
            'Set HELIOS_USERNAME and HELIOS_PASSWORD in cypress.env.json (see cypress.env.example.json).',
          );
        }
        cy.request({
          method: 'POST',
          url: '/api/login',
          headers: { 'Content-Type': 'application/json' },
          body: { username, password },
          log: false,
        })
          .its('status')
          .should('eq', 200);
      });
    },
    {
      validate: () => {
        cy.request('/api/config').its('status').should('eq', 200);
      },
      cacheAcrossSpecs: true,
    },
  );
}

/** Read the host config file (only the options, without the metadata) so a spec can put it back. */
export function snapshotConfig(): Cypress.Chainable<ConfigSnapshot> {
  return cy.request<Record<string, unknown>>('/api/config').then((response) => {
    const snapshot: ConfigSnapshot = {};
    for (const [key, value] of Object.entries(response.body)) {
      if (!METADATA_KEYS.has(key)) {
        snapshot[key] = value;
      }
    }
    return snapshot;
  });
}

/** Write a snapshot back with `POST /api/config` (the server rewrites the whole file from the body). */
export function restoreConfig(snapshot: ConfigSnapshot) {
  cy.request({
    method: 'POST',
    url: '/api/config',
    headers: { 'Content-Type': 'application/json' },
    body: snapshot,
  })
    .its('status')
    .should('eq', 200);
}
