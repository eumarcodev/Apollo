import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

const HIDDEN: Record<string, string[]> = {
  windows: ['vt', 'vaapi'],
  linux: ['amd', 'qsv', 'vt', 'pyrowave'],
  macos: ['amd', 'nv', 'qsv', 'vaapi', 'pyrowave'],
};

/** Options the page sends as parsed JSON: the server writes them back with its own formatting. */
const STRUCTURED = new Set(['dd_mode_remapping', 'global_prep_cmd', 'global_state_cmd', 'server_cmd']);

// Saves the unchanged configuration once (never Apply: no restart) and writes the snapshot back afterwards.
describe('installed config: the configuration page of the installed host', () => {
  let snapshot: ConfigSnapshot | undefined;

  before(() => {
    loginInstalled();
    snapshotConfig().then((value) => {
      snapshot = value;
    });
  });

  after(() => {
    if (snapshot) {
      loginInstalled();
      restoreConfig(snapshot);
    }
  });

  beforeEach(() => {
    loginInstalled();
  });

  it('shows the tabs of the host platform', () => {
    cy.request<{ platform: string }>('/api/config')
      .its('body.platform')
      .then((platform) => {
        cy.visit('/config');
        cy.get('[data-testid="config-tab-general"]').should('have.attr', 'aria-selected', 'true');
        for (const hidden of HIDDEN[platform] ?? []) {
          cy.get(`[data-testid="config-tab-${hidden}"]`).should('not.exist');
        }
        cy.get('[data-testid="config-tab-advanced"]').should('be.visible');
      });
  });

  it('opens a tab from the hash', () => {
    cy.visit('/config#network');
    cy.get('[data-testid="config-tab-network"]').should('have.attr', 'aria-selected', 'true');
  });

  it('saves the unchanged configuration without altering the options', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config');
    cy.get('[data-testid="config-tabs"]').should('be.visible');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.get('[data-testid="config-apply-note"]').should('be.visible');
    cy.get('[data-testid="config-apply"]').should('be.visible');
    snapshotConfig().then((after) => {
      // An option equal to its default may be dropped from the file (legacy stripping); nothing else may change.
      for (const [key, value] of Object.entries(snapshot ?? {})) {
        if (!STRUCTURED.has(key) && after[key] !== undefined) {
          expect(after[key], key).to.equal(value);
        }
      }
      for (const key of Object.keys(after)) {
        expect(snapshot ?? {}, `new option ${key}`).to.have.property(key);
      }
    });
  });
});
