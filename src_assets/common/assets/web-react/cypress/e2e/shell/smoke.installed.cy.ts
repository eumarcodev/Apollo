import { loginInstalled } from '../../support/installed';
import { PAGES } from '../../support/pages';

// Read-only: visits pages and reads files; nothing on the host is changed.
describe('installed smoke: the host serves the React UI', () => {
  beforeEach(() => {
    loginInstalled();
  });

  for (const { page, route } of PAGES) {
    it(`${route} is the React UI`, () => {
      cy.visit(route);
      cy.get('meta[name="helios-web-ui"]').should('have.attr', 'content', 'react');
      // With credentials set the server sends /welcome to /, so check the page that actually answered.
      if (page === 'index' || page === 'welcome') {
        cy.get('[data-testid="version-card"]').should('be.visible');
      } else if (page === 'config') {
        cy.get('[data-testid="config-tabs"]').should('be.visible');
      } else if (page === 'pin') {
        cy.get('[data-testid="pairing-card"]').should('be.visible');
      } else if (page === 'apps') {
        cy.get('[data-testid="apps-panel"]').should('be.visible');
      } else if (page === 'login') {
        cy.get('[data-testid="login-page"]').should('have.attr', 'data-page', 'login');
      } else if (page === 'password') {
        cy.get('[data-testid="password-form"]').should('be.visible');
      } else if (page === 'troubleshooting') {
        cy.get('[data-testid="card-logs"]').should('be.visible');
      } else {
        cy.get('[data-testid="page-placeholder"]').should('have.attr', 'data-page').and('eq', page);
      }
      // The server only routes a few files under /images; every image the page shows must really load.
      cy.get('img').each(($img) => {
        cy.wrap($img).should(($el) => {
          expect(($el[0] as HTMLImageElement).naturalWidth, $el.attr('src')).to.be.greaterThan(0);
        });
      });
    });
  }

  it('serves the locales, the favicon and the logo route', () => {
    cy.request('/assets/locale/en.json').its('body').should('have.property', 'navbar');
    cy.request('/assets/locale/pt_BR.json').its('body').should('have.property', 'navbar');
    cy.request('/images/helios.ico').its('headers').its('content-type').should('eq', 'image/x-icon');
    cy.request('/images/logo-helios-45.png').its('headers').its('content-type').should('eq', 'image/png');
  });

  it('answers the shared API calls the base uses', () => {
    cy.request('/api/configLocale').its('body').should('have.property', 'locale');
    cy.request('/api/config').its('body').should('have.property', 'platform');
  });
});
