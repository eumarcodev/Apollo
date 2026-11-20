import { loginInstalled } from '../../support/installed';

// Non-destructive: never sends valid current credentials, so the host credentials stay unchanged.
describe('installed password: the change-password page of the installed host', () => {
  beforeEach(() => {
    loginInstalled();
    cy.intercept({ method: 'POST', pathname: '/api/password' }).as('password');
    cy.visit('/password');
    cy.get('[data-testid="password-form"]').should('be.visible');
  });

  it('renders the page with both credential groups', () => {
    cy.get('h1').should('have.text', 'Password Change');
    cy.get('[data-testid="current-creds"]').should('be.visible');
    cy.get('[data-testid="new-creds"]').should('be.visible');
    cy.get('[data-testid="save"]').should('be.visible');
  });

  it('rejects a confirmation mismatch without sending a request', () => {
    cy.get('[data-testid="currentUsername"]').type('nobody');
    cy.get('[data-testid="newPassword"]').type('one');
    cy.get('[data-testid="confirmNewPassword"]').type('two');
    cy.get('[data-testid="save"]').click();
    cy.get('[data-testid="error"]').should('contain.text', 'Password mismatch');
    cy.get('@password.all').should('have.length', 0);
  });

  it('shows the server error when the current credentials are invalid', () => {
    cy.get('[data-testid="currentUsername"]').type('no-such-user-for-e2e');
    cy.get('[data-testid="currentPassword"]').type('wrong-password-for-e2e');
    cy.get('[data-testid="newPassword"]').type('irrelevant');
    cy.get('[data-testid="confirmNewPassword"]').type('irrelevant');
    cy.get('[data-testid="save"]').click();
    cy.wait('@password').its('response.statusCode').should('eq', 400);
    cy.get('[data-testid="error"]').should('contain.text', 'Internal Server Error');
    cy.get('[data-testid="success"]').should('not.exist');
  });
});
