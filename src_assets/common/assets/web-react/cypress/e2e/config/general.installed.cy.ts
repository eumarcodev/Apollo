import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

const NAME = 'Helios e2e general';

// Changes the server name only, saves (never Apply: no restart) and writes the snapshot back afterwards.
describe('installed config: General tab', () => {
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

  it('shows the fields of the tab', () => {
    cy.visit('/config');
    cy.get('[data-testid="config-general"]').should('be.visible');
    for (const id of ['locale', 'helios_name', 'min_log_level', 'update_channel', 'enable_pairing']) {
      cy.get(`#${id}`).should('exist');
    }
    cy.get('[data-testid="global_prep_cmd-add"]').should('be.visible');
    cy.get('[data-testid="server_cmd-learn-more"]').should('have.attr', 'href').and('include', 'Helios-Server');
  });

  it('saves a changed server name', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config');
    cy.get('#helios_name').clear();
    cy.get('#helios_name').type(NAME);
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.request<Record<string, unknown>>('/api/config').its('body.helios_name').should('eq', NAME);
  });
});
