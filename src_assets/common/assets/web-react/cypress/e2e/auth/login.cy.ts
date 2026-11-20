import type { StaticResponse } from 'cypress/types/net-stubbing';
import { stubServerApi, type StubLocale } from '../../support/api';

function visitLogin(url: string, login: StaticResponse = { statusCode: 200, body: '' }, locale: StubLocale = 'en') {
  stubServerApi({ locale });
  cy.intercept({ method: 'POST', pathname: '/api/login' }, login).as('login');
  cy.visit(url);
  cy.get('[data-testid="login-page"]').should('be.visible');
}

describe('auth: login page', () => {
  it('shows the greeting and the empty form without navigation', () => {
    visitLogin('/login');
    cy.get('h1').should('have.text', 'Welcome to Helios!');
    cy.get('[data-testid="sidebar"]').should('not.exist');
    cy.get('[data-testid="username"]').should('have.value', '').and('have.attr', 'required');
    cy.get('[data-testid="username"]').should('have.attr', 'autocomplete', 'username').and('be.focused');
    cy.get('[data-testid="password"]').should('have.value', '').and('have.attr', 'required');
    cy.get('[data-testid="login-page"] input[type="checkbox"]').should('not.be.checked');
  });

  it('logs in and goes to the requested page with its hash, without remembering the password', () => {
    visitLogin('/login?redir=./config#general');
    cy.window().then((win) => win.localStorage.setItem('login', JSON.stringify({ username: 'x', password: 'y' })));
    cy.get('[data-testid="username"]').type('marco');
    cy.get('[data-testid="password"]').type('secret', { log: false });
    cy.get('[data-testid="login-submit"]').click();
    cy.wait('@login').its('request.body').should('deep.equal', { username: 'marco', password: 'secret' });
    cy.location('pathname').should('eq', '/config');
    cy.location('hash').should('eq', '#general');
    cy.window().then((win) => expect(win.localStorage.getItem('login')).to.equal(null));
  });

  it('remembers the credentials when asked and prefills them next time', () => {
    visitLogin('/login');
    cy.get('[data-testid="username"]').type('marco');
    cy.get('[data-testid="password"]').type('secret', { log: false });
    cy.get('[data-testid="save-password"]').click();
    cy.get('[data-testid="login-submit"]').click();
    cy.wait('@login');
    cy.location('pathname').should('eq', '/');
    cy.window().then((win) =>
      expect(JSON.parse(win.localStorage.getItem('login') ?? 'null')).to.deep.equal({
        username: 'marco',
        password: 'secret',
      }),
    );
    visitLogin('/login');
    cy.get('[data-testid="username"]').should('have.value', 'marco');
    cy.get('[data-testid="password"]').should('have.value', 'secret');
    cy.get('[data-testid="login-page"] input[type="checkbox"]').should('be.checked');
  });

  it('ignores an invalid saved value', () => {
    stubServerApi();
    cy.visit('/login', { onBeforeLoad: (win) => win.localStorage.setItem('login', '{broken') });
    cy.get('[data-testid="username"]').should('have.value', '');
    cy.get('[data-testid="login-page"] input[type="checkbox"]').should('not.be.checked');
  });

  for (const redir of ['https://example.com/', '//example.com', '/config']) {
    it(`refuses the redirect to ${redir} and goes home`, () => {
      visitLogin(`/login?redir=${encodeURIComponent(redir)}#top`);
      cy.get('[data-testid="username"]').type('u');
      cy.get('[data-testid="password"]').type('p');
      cy.get('[data-testid="login-submit"]').click();
      cy.location('origin').should('eq', Cypress.config('baseUrl'));
      cy.location('pathname').should('eq', '/');
      cy.location('hash').should('eq', '#top');
    });
  }

  it('explains a 401 and stays on the page', () => {
    visitLogin('/login?redir=./apps', { statusCode: 401, body: '' });
    cy.get('[data-testid="username"]').type('u');
    cy.get('[data-testid="password"]').type('wrong');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="auth-error"]')
      .should('contain.text', 'Error!')
      .and('contain.text', 'Login failed: Please check your username and password');
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-testid="login-submit"]').should('not.be.disabled');
  });

  it('shows the status of any other failure, translated', () => {
    visitLogin('/login', { statusCode: 500, body: '' }, 'pt_BR');
    cy.get('h1').should('have.text', 'Bem-vindo ao Helios!');
    cy.get('[data-testid="username"]').type('u');
    cy.get('[data-testid="password"]').type('p');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="auth-error"]').should('contain.text', 'Falha no login: o servidor respondeu 500');
  });

  it('disables the button while the request runs', () => {
    visitLogin('/login', { statusCode: 401, body: '', delay: 800 });
    cy.get('[data-testid="username"]').type('u');
    cy.get('[data-testid="password"]').type('p');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="login-submit"]').should('be.disabled');
    cy.wait('@login');
    cy.get('[data-testid="login-submit"]').should('not.be.disabled');
  });

  it('requires both fields before sending', () => {
    visitLogin('/login');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="username"]').then(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true);
    });
    cy.get('@login.all').should('have.length', 0);
  });
});
