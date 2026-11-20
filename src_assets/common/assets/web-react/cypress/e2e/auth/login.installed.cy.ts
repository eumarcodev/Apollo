// Logs in through the form with the credentials of cypress.env.json and checks where it lands. Nothing on the host
// changes: no credential change, and the welcome flow is covered only by the stubbed spec.
function loginThroughForm(url: string) {
  cy.clearCookies();
  cy.visit(url);
  cy.get('[data-testid="login-page"]').should('be.visible');
  cy.env(['HELIOS_USERNAME', 'HELIOS_PASSWORD'], { log: false }).then((env) => {
    const username = env['HELIOS_USERNAME'] as string | undefined;
    const password = env['HELIOS_PASSWORD'] as string | undefined;
    if (!username || !password) {
      throw new Error('Set HELIOS_USERNAME and HELIOS_PASSWORD in cypress.env.json (see cypress.env.example.json).');
    }
    cy.get('[data-testid="username"]').clear();
    cy.get('[data-testid="username"]').type(username, { log: false });
    cy.get('[data-testid="password"]').clear();
    cy.get('[data-testid="password"]').type(password, { log: false });
  });
  cy.get('[data-testid="login-submit"]').click();
}

describe('installed auth: login on the installed host', () => {
  it('logs in with the real credentials and lands on the requested page', () => {
    loginThroughForm('/login?redir=./troubleshooting#logs');
    cy.location('pathname').should('eq', '/troubleshooting');
    cy.location('hash').should('eq', '#logs');
    cy.get('meta[name="helios-web-ui"]').should('have.attr', 'content', 'react');
    cy.request('/api/config').its('status').should('eq', 200);
    cy.window().then((win) => expect(win.localStorage.getItem('login')).to.equal(null));
  });

  it('goes home when redir is not a relative path', () => {
    loginThroughForm('/login?redir=https%3A%2F%2Fexample.com%2F');
    cy.location('origin').should('eq', Cypress.config('baseUrl'));
    cy.location('pathname').should('eq', '/');
    cy.get('[data-testid="version-card"]').should('be.visible');
  });

  it('is the page the server sends an anonymous browser to', () => {
    cy.clearCookies();
    cy.visit('/apps');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('contain', 'redir=');
    cy.get('[data-testid="login-page"]').should('be.visible');
  });
});
