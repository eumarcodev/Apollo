import { stubServerApi } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function openNetworkTab() {
  cy.visit('/config#port');
  cy.get('[data-testid="config-tab-network"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-testid="config-panel-network"] h2').should('have.text', 'Network');
}

describe('config: Network tab (Windows)', () => {
  beforeEach(() => {
    stubServerApi({ overrides: SAVED });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  });

  it('opens from the hash of an option and shows every field', () => {
    openNetworkTab();
    for (const id of [
      'upnp',
      'address_family',
      'port',
      'origin_web_ui_allowed',
      'external_ip',
      'lan_encryption_mode',
      'wan_encryption_mode',
      'ping_timeout',
      'audio_qos',
    ]) {
      cy.get(`#${id}`).should('exist');
    }
    cy.get('#port').should('have.attr', 'placeholder', '47989');
    cy.get('#ping_timeout').should('have.attr', 'placeholder', '10000');
    cy.get('[data-testid="port-table"]').within(() => {
      cy.contains('td', '47984').should('be.visible');
      cy.contains('td', '47998 - 48000').should('be.visible');
      cy.contains('Use this port').should('not.exist');
    });
    cy.get('[data-testid="port-alert-low"]').should('not.exist');
    cy.get('[data-testid="port-alert-high"]').should('not.exist');
    cy.get('[data-testid="web-ui-wan-warning"]').should('not.exist');
  });

  it('warns about the low and high ends of the port range', () => {
    openNetworkTab();
    cy.get('#port').clear().type('1028');
    cy.get('[data-testid="port-alert-low"]').should('contain.text', 'Helios cannot use ports below 1024!');
    cy.get('#port').clear().type('65515');
    cy.get('[data-testid="port-alert-high"]').should('contain.text', 'Ports above 65535 are not available!');
    cy.get('[data-testid="port-alert-low"]').should('not.exist');
  });

  it('shows the WAN warning and the HTTP port note for a changed port', () => {
    openNetworkTab();
    cy.get('#port').clear().type('47990');
    cy.get('[data-testid="port-table"]').should('contain.text', 'Use this port to connect with Moonlight.');
    cy.get('#origin_web_ui_allowed').click();
    cy.contains('[role="option"]', 'Anyone may access Web UI').click();
    cy.get('[data-testid="web-ui-wan-warning"]').should('contain.text', 'Exposing the Web UI to the internet');
  });

  it('saves only the edited options, with the legacy value spelling', () => {
    openNetworkTab();
    cy.get('#port').clear().type('47990');
    cy.get('#ping_timeout').clear().type('12000');
    cy.contains('label', 'UPnP').click();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body').should('deep.equal', {
      update_repo: 'eumarcodev/Helios-Server',
      sunshine_name: 'E2E Host',
      min_log_level: '2',
      port: '47990',
      ping_timeout: '12000',
      upnp: 'enabled',
    });
  });
});
