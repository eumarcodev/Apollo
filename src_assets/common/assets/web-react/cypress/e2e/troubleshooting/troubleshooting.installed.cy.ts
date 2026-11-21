import { loginInstalled } from '../../support/installed';

// Non-destructive: reads the host log and renders the cards. Force close, restart, quit and the display reset
// are never triggered against the installed host (the stubbed spec covers them).
describe('installed troubleshooting: logs and display reset rendering', () => {
  beforeEach(() => {
    loginInstalled();
  });

  it('shows every action card, the display reset only on Windows', () => {
    cy.request<{ platform: string }>('/api/config')
      .its('body.platform')
      .then((platform) => {
        cy.visit('/troubleshooting');
        cy.get('h1').should('be.visible');
        for (const id of ['close_apps', 'restart', 'quit', 'logs']) {
          cy.get(`section#${id}`).should('be.visible');
        }
        cy.get('#dd_reset').should(platform === 'windows' ? 'be.visible' : 'not.exist');
        if (platform === 'windows') {
          cy.get('[data-testid="dd_reset-button"]').should('be.visible').and('be.enabled');
        }
      });
  });

  it('shows the host log and keeps polling it', () => {
    cy.intercept({ method: 'GET', pathname: '/api/logs' }).as('logs');
    cy.visit('/troubleshooting');
    cy.wait('@logs').its('response.statusCode').should('eq', 200);
    cy.get('[data-testid="logs-output"]').should('not.contain.text', 'Loading...').and('not.be.empty');
    cy.wait('@logs', { timeout: 10000 }).its('response.statusCode').should('eq', 200);
  });

  it('shows the same text as GET /api/logs and filters it', () => {
    cy.request('/api/logs')
      .its('body')
      .then((log: string) => {
        const word = /[A-Za-z]{4,}/.exec(log)?.[0];
        expect(word, 'a word in the host log').to.be.a('string');
        cy.visit('/troubleshooting#logs');
        cy.get('[data-testid="logs-output"]').should('not.contain.text', 'Loading...');
        cy.get('[data-testid="logs-filter-input"]').type(word as string);
        cy.get('[data-testid="logs-output"]').should(($pre) => {
          const lines = ($pre.text() || '').split('\n').filter(Boolean);
          expect(lines.length).to.be.greaterThan(0);
          for (const line of lines) {
            expect(line).to.contain(word as string);
          }
        });
        cy.get('[data-testid="logs-filter-input"]').clear();
        cy.get('[data-testid="logs-output"]').should('not.be.empty');
      });
  });

  it('copies the shown log to the clipboard', () => {
    cy.visit('/troubleshooting');
    cy.get('[data-testid="logs-output"]').should('not.contain.text', 'Loading...');
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves();
    });
    cy.get('[data-testid="logs-copy"]').click();
    cy.get('@copy').should('have.been.calledOnce');
    cy.get('@copy').its('firstCall.args.0').should('be.a', 'string').and('not.be.empty');
  });
});
