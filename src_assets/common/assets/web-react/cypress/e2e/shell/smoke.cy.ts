import { stubServerApi, type StubLocale, type StubPlatform } from '../../support/api';
import { PAGES } from '../../support/pages';

const PLATFORMS: StubPlatform[] = ['windows', 'linux', 'macos'];
const LOCALES: StubLocale[] = ['en', 'pt_BR'];

describe('smoke: every page renders inside the shared providers', () => {
  for (const { page, route, title } of PAGES) {
    for (const locale of LOCALES) {
      it(`${route} renders the ${page} placeholder in ${locale}`, () => {
        stubServerApi({ locale });
        cy.visit(route);
        cy.wait('@configLocale');
        cy.get('meta[name="helios-web-ui"]').should('have.attr', 'content', 'react');
        if (page === 'index') {
          cy.get('[data-testid="version-card"]').should('be.visible');
        } else if (page === 'troubleshooting') {
          cy.get('[data-testid="card-logs"]').should('be.visible');
        } else {
          cy.get('[data-testid="page-placeholder"]').should('have.attr', 'data-page', page);
        }
        cy.get('h1').should('have.text', title[locale]);
        cy.get('html').should('have.attr', 'lang', locale === 'pt_BR' ? 'pt-BR' : 'en');
        cy.get('html').should('have.attr', 'data-theme');
        cy.get('main').should('have.attr', 'data-layout', page === 'welcome' || page === 'login' ? 'bare' : 'shell');
      });
    }
  }

  it('keeps query and hash on the routes (helios-page-routes)', () => {
    stubServerApi();
    cy.visit('/login?redir=./config#general');
    cy.get('[data-testid="page-placeholder"]').should('have.attr', 'data-page', 'login');
    cy.location('search').should('eq', '?redir=./config');
    cy.location('hash').should('eq', '#general');
  });

  it('falls back to English for a locale that is not shipped', () => {
    cy.intercept({ method: 'GET', pathname: '/api/configLocale' }, { body: { status: true, locale: 'de' } });
    cy.visit('/config');
    cy.get('h1').should('have.text', 'Configuration');
    cy.get('html').should('have.attr', 'lang', 'en');
  });

  for (const platform of PLATFORMS) {
    it(`serves the same pages for a ${platform} host`, () => {
      stubServerApi({ platform });
      cy.visit('/troubleshooting');
      cy.get('[data-testid="card-logs"]').should('be.visible');
    });
  }

  it('serves the locale files and the images the host needs', () => {
    cy.request('/assets/locale/en.json').its('body').should('have.property', 'navbar');
    cy.request('/assets/locale/pt_BR.json').its('body').should('have.property', 'navbar');
    for (const image of [
      'helios.ico',
      'logo-helios-45.png',
      'helios-playing.ico',
      'helios-pausing.ico',
      'helios-locked.ico',
    ]) {
      cy.request(`/images/${image}`).its('status').should('eq', 200);
    }
  });
});
