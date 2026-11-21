import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

const TIMEOUT = '1500';

// Changes the home/guide button timeout only, saves (never Apply: no restart) and writes the snapshot back afterwards.
describe('installed config: Input tab', () => {
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
    cy.visit('/config#input');
    cy.get('[data-testid="config-input"]').should('be.visible');
    for (const id of ['controller', 'keyboard', 'mouse', 'enable_input_only_mode']) {
      cy.get(`#${id}`).should('exist');
    }
  });

  it('saves a changed back button timeout', () => {
    cy.request<Record<string, unknown>>('/api/config').then(({ body }) => {
      if (body['controller'] !== 'enabled') {
        // The timeout is shown only with the controller enabled; this host has it disabled, so nothing is changed.
        cy.log('controller disabled on this host: the timeout is not shown, nothing saved');
        return;
      }
      cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
      cy.visit('/config#input');
      cy.get('#back_button_timeout').clear();
      cy.get('#back_button_timeout').type(TIMEOUT);
      cy.get('[data-testid="config-save"]').click();
      cy.wait('@save').its('response.statusCode').should('eq', 200);
      cy.request<Record<string, unknown>>('/api/config').its('body.back_button_timeout').should('eq', TIMEOUT);
    });
  });
});
