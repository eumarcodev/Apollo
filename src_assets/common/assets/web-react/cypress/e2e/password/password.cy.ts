import type { StaticResponse } from 'cypress/types/net-stubbing';
import { stubServerApi, type StubLocale } from '../../support/api';

type Field = ['currentUsername', 'currentPassword', 'newUsername', 'newPassword', 'confirmNewPassword'][number];

function visitPassword(locale: StubLocale = 'en', passwordResponse?: StaticResponse) {
  stubServerApi({ locale });
  cy.intercept(
    { method: 'POST', pathname: '/api/password' },
    passwordResponse ?? { statusCode: 200, body: { status: true } },
  ).as('password');
  cy.visit('/password');
  cy.get('[data-testid="password-form"]').should('be.visible');
}

function fillForm(values: Partial<Record<Field, string>>) {
  for (const [id, value] of Object.entries(values)) {
    cy.get(`[data-testid="${id}"]`).type(value);
  }
}

describe('password: change the web UI credentials', () => {
  it('shows the two credential groups with the required flags and autocomplete values', () => {
    visitPassword();
    cy.get('h1').should('have.text', 'Password Change');
    cy.get('[data-testid="current-creds"]').should('contain.text', 'Current Credentials');
    cy.get('[data-testid="new-creds"]')
      .should('contain.text', 'New Credentials')
      .and('contain.text', 'If not specified');
    cy.get('[data-testid="currentUsername"]').should('have.attr', 'required');
    cy.get('[data-testid="currentPassword"]')
      .should('have.attr', 'autocomplete', 'current-password')
      .and('not.have.attr', 'required');
    cy.get('[data-testid="newUsername"]').should('not.have.attr', 'required');
    for (const id of ['newPassword', 'confirmNewPassword']) {
      cy.get(`[data-testid="${id}"]`)
        .should('have.attr', 'autocomplete', 'new-password')
        .and('have.attr', 'type', 'password')
        .and('have.attr', 'required');
    }
    cy.get('[data-testid="save"]').should('contain.text', 'Save');
  });

  it('shows the mismatch error and sends no request', () => {
    visitPassword();
    fillForm({ currentUsername: 'x', newPassword: 'one', confirmNewPassword: 'two' });
    cy.get('[data-testid="save"]').click();
    cy.get('[data-testid="error"]').should('contain.text', 'Password mismatch');
    cy.get('@password.all').should('have.length', 0);
  });

  it('does not submit while a required field is empty', () => {
    visitPassword();
    fillForm({ newPassword: 'a', confirmNewPassword: 'a' });
    cy.get('[data-testid="save"]').click();
    cy.get('@password.all').should('have.length', 0);
    cy.get('[data-testid="error"]').should('not.exist');
  });

  it('posts the five fields, shows the success message and reloads after five seconds', () => {
    cy.clock();
    visitPassword();
    fillForm({
      currentUsername: 'x',
      currentPassword: 'old',
      newUsername: 'y',
      newPassword: 'secret',
      confirmNewPassword: 'secret',
    });
    cy.get('[data-testid="save"]').click();
    cy.wait('@password').its('request.body').should('deep.equal', {
      currentUsername: 'x',
      currentPassword: 'old',
      newUsername: 'y',
      newPassword: 'secret',
      confirmNewPassword: 'secret',
    });
    cy.get('[data-testid="success"]').should('contain.text', 'Password has been changed successfully');
    cy.get('@configLocale.all').should('have.length', 1);
    cy.tick(4900);
    cy.get('@configLocale.all').should('have.length', 1);
    cy.tick(100);
    // The reload loads the page again, which fetches the locale again.
    cy.get('@configLocale.all').should('have.length', 2);
  });

  it('shows the error the server reports on a 200 answer', () => {
    visitPassword('en', { statusCode: 200, body: { status: false, error: 'Invalid Current Credentials' } });
    fillForm({ currentUsername: 'x', newPassword: 'a', confirmNewPassword: 'a' });
    cy.get('[data-testid="save"]').click();
    cy.get('[data-testid="error"]').should('contain.text', 'Invalid Current Credentials');
    cy.get('[data-testid="success"]').should('not.exist');
  });

  it('shows Internal Server Error on a non-200 answer', () => {
    visitPassword('en', { statusCode: 400, body: { status: false, error: 'Invalid Current Credentials' } });
    fillForm({ currentUsername: 'x', newPassword: 'a', confirmNewPassword: 'a' });
    cy.get('[data-testid="save"]').click();
    cy.get('[data-testid="error"]').should('contain.text', 'Internal Server Error');
  });

  it('is translated to pt_BR', () => {
    visitPassword('pt_BR');
    cy.get('h1').should('have.text', 'Alteração de senha');
    cy.get('[data-testid="current-creds"]').should('contain.text', 'Credenciais atuais');
    fillForm({ currentUsername: 'x', newPassword: 'a', confirmNewPassword: 'b' });
    cy.get('[data-testid="save"]').should('contain.text', 'Salvar').click();
    cy.get('[data-testid="error"]').should('contain.text', 'As senhas não coincidem');
  });
});
