import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

// Changes ping_timeout only, saves (never Apply: no restart) and restores the snapshot afterwards.
// Port, address family, web UI origin and encryption are never touched on the installed host (they can lock the test out).
describe('installed config: Network tab of the installed host', () => {
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

  it('renders the Network fields and the port table of the installed port', () => {
    cy.request<{ port: string | number }>('/api/config')
      .its('body.port')
      .then((port) => {
        cy.visit('/config#ping_timeout');
        cy.get('[data-testid="config-tab-network"]').should('have.attr', 'aria-selected', 'true');
        for (const id of ['upnp', 'address_family', 'port', 'origin_web_ui_allowed', 'ping_timeout', 'audio_qos']) {
          cy.get(`#${id}`).should('exist');
        }
        cy.get('[data-testid="port-table"]').should('contain.text', String(Number(port) + 1));
      });
  });

  it('saves a changed ping timeout and the host reports it', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config#ping_timeout');
    cy.get('#ping_timeout').clear();
    cy.get('#ping_timeout').type('10500');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.request<Record<string, unknown>>('/api/config').its('body.ping_timeout').should('eq', '10500');
  });
});
