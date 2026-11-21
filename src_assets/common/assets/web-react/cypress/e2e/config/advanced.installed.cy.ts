import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

const FEC = '35';

// Changes FEC only, saves (never Apply: no restart) and writes the snapshot back afterwards.
describe('installed config: Advanced tab', () => {
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
    cy.visit('/config#advanced');
    cy.get('[data-testid="config-advanced"]').should('be.visible');
    for (const id of ['fec_percentage', 'qp', 'min_threads', 'hevc_mode', 'av1_mode', 'encoder']) {
      cy.get(`#${id}`).should('exist');
    }
  });

  it('saves a changed FEC percentage', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config#advanced');
    cy.get('#fec_percentage').clear();
    cy.get('#fec_percentage').type(FEC);
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.request<Record<string, unknown>>('/api/config').its('body.fec_percentage').should('eq', FEC);
  });
});
