import { loginInstalled } from '../../support/installed';

// Read-only: reads the home page and the host config; nothing on the host is changed.
describe('installed dashboard: the home page of the installed host', () => {
  beforeEach(() => {
    loginInstalled();
  });

  it('shows the version that GET /api/config reports', () => {
    cy.request<{ version: string }>('/api/config')
      .its('body.version')
      .then((version) => {
        cy.visit('/');
        cy.get('[data-testid="version-card"]').should('contain.text', `Version ${version}`);
      });
  });

  it('shows a status for the version (update check, dirty or pre-release notice)', () => {
    cy.visit('/');
    cy.get('[data-testid="version-card"] [data-testid^="notice-"]').should('have.length.at.least', 1);
    cy.get('[data-testid="loading-latest"]').should('not.exist');
  });

  it('shows the client, resource and legal cards with their links', () => {
    cy.visit('/');
    cy.get('[data-testid="client-android"] a').should(
      'have.attr',
      'href',
      'https://github.com/eumarcodev/Selene-Game-Streaming',
    );
    cy.get('[data-testid="resource-issues"]').should(
      'have.attr',
      'href',
      'https://github.com/eumarcodev/Helios-Server/issues',
    );
    cy.get('[data-testid="legal-license"]').should(
      'have.attr',
      'href',
      'https://github.com/eumarcodev/Helios-Server/blob/master/LICENSE',
    );
  });

  it('only shows the startup error alert when the host log has a fatal line', () => {
    cy.request('/api/logs')
      .its('body')
      .then((log: string) => {
        const hasFatal = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}]:\s+Fatal:/.test(log);
        cy.visit('/');
        cy.get('[data-testid="version-card"]').should('be.visible');
        cy.get('[data-testid="startup-errors"]').should(hasFatal ? 'exist' : 'not.exist');
      });
  });
});
