import { stubServerApi } from '../../support/api';

const NAV = [
  { id: 'home', route: '/', href: './', en: 'Home', pt: 'Início' },
  { id: 'pin', route: '/pin', href: './pin', en: 'PIN', pt: 'PIN' },
  { id: 'applications', route: '/apps', href: './apps', en: 'Applications', pt: 'Aplicativos' },
  { id: 'configuration', route: '/config', href: './config', en: 'Configuration', pt: 'Configuração' },
  { id: 'password', route: '/password', href: './password', en: 'Change Password', pt: 'Alterar senha' },
  {
    id: 'troubleshooting',
    route: '/troubleshooting',
    href: './troubleshooting',
    en: 'Troubleshooting',
    pt: 'Solução de Problemas',
  },
] as const;

describe('shell: sidebar navigation (desktop)', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  for (const item of NAV) {
    it(`${item.route} lists the six items and highlights ${item.id}`, () => {
      stubServerApi();
      cy.visit(item.route);
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('[data-testid="sidebar"] nav a').should('have.length', 6);
      NAV.forEach((entry) => {
        cy.get(`[data-testid="sidebar"] [data-testid="nav-${entry.id}"]`)
          .should('have.attr', 'href', entry.href)
          .and('contain.text', entry.en);
      });
      cy.get('[data-testid="sidebar"] [aria-current="page"]').should('have.length', 1);
      cy.get(`[data-testid="sidebar"] [data-testid="nav-${item.id}"]`).should('have.attr', 'aria-current', 'page');
      cy.get('[data-testid="menu-button"]').should('not.be.visible');
    });
  }

  it('treats /index.html as Home', () => {
    stubServerApi();
    cy.visit('/index.html');
    cy.get('[data-testid="sidebar"] [data-testid="nav-home"]').should('have.attr', 'aria-current', 'page');
  });

  it('brand links to the home page with the Helios logo', () => {
    stubServerApi();
    cy.visit('/config');
    cy.get('[data-testid="sidebar"] [data-testid="brand"]').should('have.attr', 'href', './');
    cy.get('[data-testid="sidebar"] img[alt="Helios"]').should('have.attr', 'src', '/images/logo-helios-45.png');
  });

  it('navigates with a full page load', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('[data-testid="sidebar"] [data-testid="nav-configuration"]').click();
    cy.location('pathname').should('eq', '/config');
    cy.get('[data-testid="sidebar"] [data-testid="nav-configuration"]').should('have.attr', 'aria-current', 'page');
  });

  it('translates the navigation to pt_BR', () => {
    stubServerApi({ locale: 'pt_BR' });
    cy.visit('/');
    NAV.forEach((entry) => {
      cy.get(`[data-testid="sidebar"] [data-testid="nav-${entry.id}"]`).should('contain.text', entry.pt);
    });
  });

  it('the content area scrolls on its own', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('main').should('have.css', 'overflow-y', 'auto');
  });
});

describe('shell: theme', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  for (const value of ['light', 'dark', 'auto'] as const) {
    it(`stores ${value} in localStorage.theme and keeps it after a reload`, () => {
      stubServerApi();
      cy.visit('/');
      cy.get(`[data-testid="sidebar"] [data-testid="theme-${value}"]`).click();
      cy.window().its('localStorage').invoke('getItem', 'theme').should('eq', value);
      cy.reload();
      cy.get(`[data-testid="sidebar"] [data-testid="theme-${value}"]`).should('have.attr', 'aria-pressed', 'true');
    });
  }

  it('applies light and dark to <html>', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('[data-testid="sidebar"] [data-testid="theme-dark"]').click();
    cy.get('html').should('have.class', 'dark').and('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="sidebar"] [data-testid="theme-light"]').click();
    cy.get('html').should('have.class', 'light').and('have.attr', 'data-theme', 'light');
  });

  it('applies the stored theme before the app script runs (no flash)', () => {
    stubServerApi();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('theme', 'dark');
      },
    });
    cy.document().then((doc) => {
      const scripts = Array.from(doc.head.querySelectorAll('script'));
      const bootstrap = scripts.findIndex((s) => !s.src && (s.textContent ?? '').includes("getItem('theme')"));
      const appScript = scripts.findIndex((s) => s.type === 'module');
      expect(bootstrap, 'inline theme script').to.be.at.least(0);
      expect(bootstrap, 'before the module script').to.be.lessThan(appScript);
    });
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });

  it('follows the system theme while nothing is stored', () => {
    stubServerApi();
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'matchMedia').callsFake(
          (query: string) =>
            ({
              matches: query.includes('dark'),
              media: query,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
            }) as unknown as MediaQueryList,
        );
      },
    });
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="sidebar"] [data-testid="theme-dark"]').should('have.attr', 'aria-pressed', 'true');
  });
});

describe('shell: mobile drawer', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
  });

  it('hides the sidebar and opens the navigation from the menu button', () => {
    stubServerApi();
    cy.visit('/apps');
    cy.get('[data-testid="sidebar"]').should('not.be.visible');
    cy.get('[data-testid="menu-button"]').should('be.visible').click();
    cy.get('[data-testid="drawer"]').should('be.visible');
    cy.get('[data-testid="drawer"] nav a').should('have.length', 6);
    cy.get('[data-testid="drawer"] [data-testid="nav-applications"]').should('have.attr', 'aria-current', 'page');
  });

  it('closes with Escape and gives the focus back to the menu button', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="drawer"]').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="drawer"]').should('not.exist');
    cy.focused().should('have.attr', 'data-testid', 'menu-button');
  });

  it('changes the theme from inside the drawer without closing it', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="drawer"] [data-testid="theme-dark"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('[data-testid="drawer"]').should('be.visible');
  });

  it('navigates from the drawer', () => {
    stubServerApi();
    cy.visit('/');
    cy.get('[data-testid="menu-button"]').click();
    cy.get('[data-testid="drawer"] [data-testid="nav-pin"]').click();
    cy.location('pathname').should('eq', '/pin');
  });
});

describe('shell: public pages', () => {
  for (const route of ['/welcome', '/login']) {
    it(`${route} is centered without sidebar and uses the theme`, () => {
      stubServerApi();
      cy.visit(route);
      cy.get('main').should('have.attr', 'data-layout', 'bare');
      cy.get('[data-testid="sidebar"]').should('not.exist');
      cy.get('[data-testid="menu-button"]').should('not.exist');
      cy.get('html').should('have.attr', 'data-theme');
    });
  }
});
