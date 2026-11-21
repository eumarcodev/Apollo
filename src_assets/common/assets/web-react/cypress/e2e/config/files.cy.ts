import { stubServerApi } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function visitFiles() {
  stubServerApi({ overrides: { ...SAVED } });
  cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  cy.visit('/config#files');
  cy.get('[data-testid="config-files"]').should('be.visible');
}

describe('config: Config Files tab', () => {
  it('shows the six path fields with their placeholders and empty values', () => {
    visitFiles();
    cy.get('#file_apps').should('have.attr', 'placeholder', 'apps.json').and('have.value', '');
    cy.get('#credentials_file').should('have.attr', 'placeholder', 'sunshine_state.json');
    cy.get('#log_path').should('have.attr', 'placeholder', 'sunshine.log');
    cy.get('#pkey').should('have.attr', 'placeholder', '/dir/pkey.pem');
    cy.get('#cert').should('have.attr', 'placeholder', '/dir/cert.pem');
    cy.get('#file_state').should('have.attr', 'placeholder', 'sunshine_state.json');
  });

  it('saves only the paths that were typed', () => {
    visitFiles();
    cy.get('#log_path').type('/var/log/helios.log');
    cy.get('#pkey').type('/keys/pkey.pem');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.include', { log_path: '/var/log/helios.log', pkey: '/keys/pkey.pem' })
      .and('not.have.property', 'file_apps');
  });
});
