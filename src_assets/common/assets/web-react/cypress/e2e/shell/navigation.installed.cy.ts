import { loginInstalled } from '../../support/installed';

const ROUTES = [
  { route: '/', id: 'home' },
  { route: '/pin', id: 'pin' },
  { route: '/apps', id: 'applications' },
  { route: '/config', id: 'configuration' },
  { route: '/password', id: 'password' },
  { route: '/troubleshooting', id: 'troubleshooting' },
] as const;

// Read-only: opens pages and, in the browser only, stores the theme choice (restored in after()).
describe('installed shell: navigation and theme', () => {
  beforeEach(() => {
    loginInstalled();
    cy.viewport(1280, 800);
  });

  for (const { route, id } of ROUTES) {
    it(`${route} shows the sidebar with ${id} active`, () => {
      cy.visit(route);
      cy.get('[data-testid="sidebar"] nav a').should('have.length', 6);
      cy.get('[data-testid="sidebar"] [aria-current="page"]').should('have.length', 1);
      cy.get(`[data-testid="sidebar"] [data-testid="nav-${id}"]`).should('have.attr', 'aria-current', 'page');
    });
  }

  it('serves the brand logo', () => {
    cy.visit('/');
    cy.get('[data-testid="sidebar"] img[alt="Helios"]').should('be.visible');
    cy.request('/images/logo-helios-45.png').its('status').should('eq', 200);
  });

  it('applies the theme before the app script and keeps the choice', () => {
    cy.visit('/');
    cy.get('[data-testid="sidebar"] [data-testid="theme-dark"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.reload();
    cy.document().then((doc) => {
      const scripts = Array.from(doc.head.querySelectorAll('script'));
      const bootstrap = scripts.findIndex((s) => !s.src && (s.textContent ?? '').includes("getItem('theme')"));
      expect(bootstrap, 'inline theme script').to.be.at.least(0);
      expect(bootstrap, 'before the module script').to.be.lessThan(scripts.findIndex((s) => s.type === 'module'));
    });
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="sidebar"] [data-testid="theme-auto"]').click();
  });

  it('opens the drawer on a phone', () => {
    cy.viewport(390, 844);
    cy.visit('/config');
    cy.get('[data-testid="sidebar"]').should('not.be.visible');
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="drawer"] [data-testid="nav-configuration"]').should('have.attr', 'aria-current', 'page');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="drawer"]').should('not.exist');
  });
});
