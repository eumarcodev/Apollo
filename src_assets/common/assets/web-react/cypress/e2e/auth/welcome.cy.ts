import type { StaticResponse } from 'cypress/types/net-stubbing';
import { stubServerApi, type StubLocale } from '../../support/api';

function visitWelcome(
  password: StaticResponse = { statusCode: 200, body: { status: true } },
  locale: StubLocale = 'en',
) {
  stubServerApi({ locale });
  cy.intercept({ method: 'POST', pathname: '/api/password' }, password).as('password');
  cy.visit('/welcome');
  cy.get('[data-testid="welcome-page"]').should('be.visible');
}

function fill(newPassword: string, confirm: string) {
  cy.get('[data-testid="new-password"]').type(newPassword, { log: false });
  cy.get('[data-testid="confirm-password"]').type(confirm, { log: false });
  cy.get('[data-testid="welcome-submit"]').click();
}

describe('auth: welcome page (first run)', () => {
  it('shows the greeting, the warning, the form with the default username and the resources', () => {
    visitWelcome();
    cy.get('h1').should('have.text', 'Welcome to Helios!');
    cy.get('[data-testid="sidebar"]').should('not.exist');
    cy.get('[data-testid="create-creds-alert"]').should('contain.text', 'Keep them safe');
    cy.get('[data-testid="new-username"]').should('have.value', 'helios').and('have.attr', 'autocomplete', 'username');
    cy.get('[data-testid="new-password"]').should('have.attr', 'required');
    cy.get('[data-testid="new-password"]').should('have.attr', 'autocomplete', 'new-password');
    cy.get('[data-testid="confirm-password"]').should('have.attr', 'required');
    cy.get('[data-testid="resource-card"]').should('be.visible');
    cy.get('[data-testid="resource-issues"]').should(
      'have.attr',
      'href',
      'https://github.com/eumarcodev/Helios-Server/issues',
    );
  });

  it('puts the resources next to the form at 1080p', () => {
    cy.viewport(1920, 1080);
    visitWelcome();
    cy.get('[data-testid="welcome-form-card"]').then(($form) => {
      cy.get('[data-testid="resource-card"]').should(($card) => {
        expect($card[0]!.getBoundingClientRect().left).to.be.greaterThan($form[0]!.getBoundingClientRect().right);
      });
    });
    cy.document().its('documentElement.scrollWidth').should('be.lte', 1920);
  });

  it('stacks the resources below the form on a phone, without horizontal scroll', () => {
    cy.viewport(390, 844);
    visitWelcome();
    cy.get('[data-testid="welcome-form-card"]').then(($form) => {
      cy.get('[data-testid="resource-card"]').should(($card) => {
        expect($card[0]!.getBoundingClientRect().top).to.be.greaterThan($form[0]!.getBoundingClientRect().bottom);
      });
    });
    cy.document().its('documentElement.scrollWidth').should('be.lte', 390);
  });

  it('refuses a password mismatch without sending anything', () => {
    visitWelcome();
    fill('abc', 'abd');
    cy.get('[data-testid="auth-error"]').should('contain.text', 'Password mismatch');
    cy.get('@password.all').should('have.length', 0);
  });

  it('saves the credentials with the legacy payload and reloads after 5 s', () => {
    cy.clock(null, ['setTimeout']);
    visitWelcome();
    cy.get('[data-testid="new-username"]').clear();
    cy.get('[data-testid="new-username"]').type('admin');
    fill('s3cret', 's3cret');
    cy.wait('@password')
      .its('request.body')
      .should('deep.equal', { newUsername: 'admin', newPassword: 's3cret', confirmNewPassword: 's3cret' });
    cy.get('[data-testid="auth-success"]').should(
      'contain.text',
      'This page will reload soon, your browser will ask you for the new credentials',
    );
    cy.window().then((win) => {
      (win as unknown as Record<string, unknown>)['beforeReload'] = true;
    });
    cy.tick(4900);
    cy.window().should('have.property', 'beforeReload', true);
    cy.tick(200);
    cy.window().should('not.have.property', 'beforeReload');
    cy.get('[data-testid="new-username"]').should('have.value', 'helios');
  });

  it('shows the error the server returns with a 200 answer', () => {
    visitWelcome({ statusCode: 200, body: { status: false, error: 'Invalid Username' } });
    fill('a', 'a');
    cy.get('[data-testid="auth-error"]').should('contain.text', 'Invalid Username');
    cy.get('[data-testid="auth-success"]').should('not.exist');
  });

  it('shows "Internal Server Error" for any other status, translated', () => {
    visitWelcome({ statusCode: 400, body: { status: false, error: 'Password Mismatch' } }, 'pt_BR');
    cy.get('h1').should('have.text', 'Bem-vindo ao Helios!');
    fill('a', 'a');
    cy.get('[data-testid="auth-error"]').should('contain.text', 'Erro interno do servidor');
  });

  it('disables the button while the request runs', () => {
    visitWelcome({ statusCode: 500, body: '', delay: 800 });
    fill('a', 'a');
    cy.get('[data-testid="welcome-submit"]').should('be.disabled');
    cy.wait('@password');
    cy.get('[data-testid="welcome-submit"]').should('not.be.disabled');
    cy.get('[data-testid="auth-error"]').should('contain.text', 'Internal Server Error');
  });
});
