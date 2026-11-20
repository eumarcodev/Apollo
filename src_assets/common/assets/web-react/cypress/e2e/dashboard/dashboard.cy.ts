import { stubServerApi, type StubLocale } from '../../support/api';

interface HomeStub {
  version: string;
  releases?: unknown;
  /** Status of the GitHub answer (default 200). */
  githubStatus?: number;
  log?: string;
  options?: Record<string, string>;
  locale?: StubLocale;
}

const RELEASES = [
  {
    tag_name: 'v1.3.0',
    name: 'Helios 1.3.0',
    body: 'What changed:\n- faster start\n- fewer bugs',
    html_url: 'https://example.test/releases/1.3.0',
  },
  { tag_name: 'v1.2.0', name: 'Helios 1.2.0', body: 'old', html_url: 'https://example.test/releases/1.2.0' },
  { tag_name: 'v1.4.0-rc.1', name: 'Helios 1.4.0 RC 1', body: 'rc', html_url: 'https://example.test/releases/rc1' },
  { tag_name: 'v9.9.9', name: 'draft', body: '', html_url: 'https://example.test/draft', draft: true },
];

/** Visit the home page with a synthetic version, GitHub releases and host log. */
function visitHome({
  version,
  releases = RELEASES,
  githubStatus = 200,
  log = '',
  options = {},
  locale = 'en',
}: HomeStub) {
  stubServerApi({
    locale,
    overrides: {
      'GET /api/config': {
        statusCode: 200,
        body: { status: true, platform: 'windows', version, update_repo: 'eumarcodev/Helios-Server', ...options },
      },
      'GET /api/logs': { statusCode: 200, body: log },
    },
  });
  cy.intercept(
    { method: 'GET', url: 'https://api.github.com/repos/**' },
    { statusCode: githubStatus, body: releases },
  ).as('githubReleases');
  cy.visit('/');
}

describe('dashboard: version and update status', () => {
  it('reports an up-to-date stable build', () => {
    visitHome({ version: '1.3.0' });
    cy.get('h1').should('have.text', 'Hello, Helios!');
    cy.get('[data-testid="version-card"]').should('contain.text', 'Version 1.3.0');
    cy.get('[data-testid="notice-latest"]').should('contain.text', 'You are running the latest version of Helios');
    cy.get('[data-testid="channel-badge"]').should('not.exist');
    cy.get('[data-testid="notice-update"]').should('not.exist');
    cy.get('[data-testid="loading-latest"]').should('not.exist');
  });

  it('asks the releases API of the configured repository (30 per page)', () => {
    stubServerApi({
      overrides: {
        'GET /api/config': {
          statusCode: 200,
          body: { status: true, platform: 'windows', version: '1.3.0', update_repo: 'fork/helios' },
        },
        'GET /api/logs': { statusCode: 200, body: '' },
      },
    });
    cy.intercept({ method: 'GET', url: 'https://api.github.com/repos/fork/helios/releases?per_page=30' }, []).as(
      'forkReleases',
    );
    cy.visit('/');
    cy.wait('@forkReleases');
    cy.get('[data-testid="notice-latest"]').should('be.visible');
  });

  it('shows the loading text while the release check runs', () => {
    stubServerApi({
      overrides: {
        'GET /api/config': { statusCode: 200, body: { status: true, platform: 'windows', version: '1.3.0' } },
        'GET /api/logs': { statusCode: 200, body: '' },
      },
    });
    cy.intercept({ method: 'GET', url: 'https://api.github.com/repos/**' }, { delay: 1500, body: [] });
    cy.visit('/');
    cy.get('[data-testid="loading-latest"]').should('contain.text', 'Loading latest release...');
    cy.get('[data-testid="notice-latest"]').should('be.visible');
    cy.get('[data-testid="loading-latest"]').should('not.exist');
  });

  it('announces a newer stable release with its notes and a download link', () => {
    visitHome({ version: '1.2.0' });
    cy.get('[data-testid="notice-update"]')
      .should('contain.text', 'A new Stable Version is Available!')
      .within(() => {
        cy.get('[data-testid="release-name"]').should('have.text', 'Helios 1.3.0');
        cy.get('[data-testid="release-body"]').should('contain.text', '- faster start');
        cy.get('[data-testid="download"]')
          .should('have.attr', 'href', 'https://example.test/releases/1.3.0')
          .and('have.attr', 'target', '_blank');
      });
    cy.get('[data-testid="notice-latest"]').should('not.exist');
  });

  it('follows the rc channel and calls the newer rc a pre-release update', () => {
    visitHome({ version: '1.3.0', options: { update_channel: 'rc' } });
    cy.get('[data-testid="notice-update"]')
      .should('contain.text', 'A new Pre-Release Version is Available!')
      .find('[data-testid="release-name"]')
      .should('have.text', 'Helios 1.4.0 RC 1');
  });

  it('treats the legacy notify_pre_releases flag as the rc channel', () => {
    visitHome({ version: '1.3.0', options: { notify_pre_releases: 'enabled' } });
    cy.get('[data-testid="notice-update"]').should('contain.text', 'A new Pre-Release Version is Available!');
  });

  it('thanks a dirty local build and does not call it the latest', () => {
    visitHome({ version: '0.0.0.830cbec0.dirty', releases: [] });
    cy.get('[data-testid="notice-dirty"]').should(
      'contain.text',
      'Thank you for helping to make Helios a better software!',
    );
    cy.get('[data-testid="notice-latest"]').should('not.exist');
  });

  it('labels an installed pre-release and warns about it', () => {
    visitHome({ version: '1.3.0-rc.1' });
    cy.get('[data-testid="channel-badge"]').should('have.text', 'RC');
    cy.get('[data-testid="notice-pre-release"]').should('contain.text', 'pre-release version of Helios');
  });

  it('still renders the page when GitHub does not answer', () => {
    visitHome({ version: '1.3.0', githubStatus: 403, releases: { message: 'rate limit exceeded' } });
    cy.get('[data-testid="version-card"]').should('contain.text', 'Version 1.3.0');
    cy.get('[data-testid="notice-latest"]').should('be.visible');
    cy.get('[data-testid="clients-card"]').should('be.visible');
  });

  it('is translated to Portuguese', () => {
    visitHome({ version: '1.3.0', locale: 'pt_BR' });
    cy.get('h1').should('have.text', 'Olá, Helios!');
    cy.get('[data-testid="version-card"]').should('contain.text', 'Versão 1.3.0');
    cy.get('[data-testid="clients-card"]').should('contain.text', 'Em breve...');
  });
});

describe('dashboard: fatal startup errors', () => {
  const LOG = [
    '[2026-11-20 10:00:00.123]: Info: Helios started',
    '[2026-11-20 10:00:01.456]: Fatal: Unable to find a display or encoder',
    '[2026-11-20 10:00:02.000]: Warning: something minor',
    '[2026-11-20 10:00:03.000]: Fatal: Second fatal line',
  ].join('\n');

  it('lists the fatal lines and links to the logs', () => {
    visitHome({ version: '1.3.0', log: LOG });
    cy.get('[data-testid="startup-errors"]')
      .should('contain.text', 'Attention!')
      .and('contain.text', 'STRONGLY RECOMMEND');
    cy.get('[data-testid="startup-error-list"] li')
      .should('have.length', 2)
      .first()
      .should('contain.text', 'Fatal: Unable to find a display or encoder');
    cy.get('[data-testid="view-logs"]').should('have.attr', 'href', './troubleshooting#logs');
    cy.get('[data-testid="startup-errors"]').should('not.contain.text', 'something minor');
  });

  it('hides the alert when the log has no fatal line', () => {
    visitHome({ version: '1.3.0', log: '[2026-11-20 10:00:00.123]: Warning: not fatal' });
    cy.get('[data-testid="notice-latest"]').should('be.visible');
    cy.get('[data-testid="startup-errors"]').should('not.exist');
  });
});

describe('dashboard: clients, resources and legal', () => {
  beforeEach(() => {
    visitHome({ version: '1.3.0' });
  });

  it('links the Android client and shows the others as coming soon', () => {
    cy.get('[data-testid="client-android"] a')
      .should('have.attr', 'href', 'https://github.com/eumarcodev/Selene-Game-Streaming')
      .and('have.attr', 'target', '_blank');
    for (const id of ['ios', 'desktop']) {
      cy.get(`[data-testid="client-${id}"]`).should('contain.text', 'Coming soon...').find('a').should('not.exist');
    }
  });

  it('keeps the exact resource and legal URLs, each opening in a new tab', () => {
    const links: Record<string, string> = {
      'resource-issues': 'https://github.com/eumarcodev/Helios-Server/issues',
      'resource-docs': 'https://github.com/eumarcodev/Helios-Server/tree/master/docs',
      'resource-troubleshooting': 'https://github.com/eumarcodev/Helios-Server/blob/master/docs/troubleshooting.md',
      'legal-license': 'https://github.com/eumarcodev/Helios-Server/blob/master/LICENSE',
      'legal-notice': 'https://github.com/eumarcodev/Helios-Server/blob/master/NOTICE',
    };
    for (const [id, href] of Object.entries(links)) {
      cy.get(`[data-testid="${id}"]`).should('have.attr', 'href', href).and('have.attr', 'target', '_blank');
    }
  });
});
