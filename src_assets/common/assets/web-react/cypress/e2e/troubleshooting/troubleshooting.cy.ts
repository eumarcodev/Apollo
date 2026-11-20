import { stubServerApi, type StubLocale, type StubPlatform } from '../../support/api';

interface Visit {
  platform?: StubPlatform;
  locale?: StubLocale;
  log?: string;
  hash?: string;
}

/** Visit the page with the maintenance endpoints of a healthy host; specs override the one they exercise. */
function visitPage({ platform = 'windows', locale = 'en', log = 'Info: started', hash = '' }: Visit = {}) {
  stubServerApi({
    platform,
    locale,
    overrides: {
      'GET /api/logs': { statusCode: 200, body: log, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    },
  });
  cy.visit(`/troubleshooting${hash}`);
  cy.get('[data-testid="card-logs"]').should('be.visible');
}

function markWindow() {
  cy.window().then((win) => {
    (win as unknown as Record<string, unknown>)['__marker'] = true;
  });
}

function windowWasReloaded() {
  cy.window().should((win) => {
    expect((win as unknown as Record<string, unknown>)['__marker']).to.equal(undefined);
  });
}

describe('troubleshooting: cards', () => {
  it('shows the title and a card with an anchor for every action and for the logs', () => {
    visitPage();
    cy.get('h1').should('have.text', 'Troubleshooting');
    for (const id of ['close_apps', 'restart', 'quit', 'dd_reset', 'logs']) {
      cy.get(`section#${id}`).should('be.visible');
    }
  });

  it('shows the display reset on Windows only', () => {
    visitPage({ platform: 'windows' });
    cy.get('#dd_reset').should('be.visible');
    for (const platform of ['linux', 'macos'] as const) {
      visitPage({ platform });
      cy.get('[data-testid="card-quit"]').should('be.visible');
      cy.get('#dd_reset').should('not.exist');
    }
  });

  it('scrolls to the logs card when the URL ends in #logs (the link of the home page)', () => {
    visitPage({ platform: 'linux', hash: '#logs' });
    cy.get('#logs').should(($logs) => {
      const top = $logs[0]?.getBoundingClientRect().top ?? 9999;
      expect(top).to.be.within(-2, 200);
    });
  });

  it('is translated to Portuguese', () => {
    visitPage({ locale: 'pt_BR' });
    cy.get('h1').should('have.text', 'Solução de Problemas');
    cy.get('[data-testid="close_apps-button"]').should('have.text', 'Forçar fechamento');
    cy.get('[data-testid="restart-button"]').should('have.text', 'Reiniciar o Helios');
    cy.get('[data-testid="logs-copy"]').should('have.attr', 'aria-label', 'Copiar logs');
    cy.get('[data-testid="logs-filter-input"]').should('have.attr', 'placeholder', 'Procurar...');
  });
});

describe('troubleshooting: force close', () => {
  it('posts to the host, disables the button while it runs and shows the success for 5 s', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/apps/close' }, { delay: 600, body: { status: true } }).as('close');
    cy.get('[data-testid="close_apps-button"]').click();
    cy.get('[data-testid="close_apps-button"]').should('be.disabled');
    cy.wait('@close').its('request.headers.content-type').should('contain', 'application/json');
    cy.get('[data-testid="close_apps-notice"]')
      .should('contain.text', 'Application Closed Successfully!')
      .and('have.attr', 'data-status', 'success');
    cy.get('[data-testid="close_apps-button"]').should('be.enabled');
    cy.get('[data-testid="close_apps-notice"]', { timeout: 8000 }).should('not.exist');
  });

  it('shows the error when the host answers status false', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/apps/close' }, { body: { status: false } });
    cy.get('[data-testid="close_apps-button"]').click();
    cy.get('[data-testid="close_apps-notice"]')
      .should('contain.text', 'Error while closing Application')
      .and('have.attr', 'data-status', 'danger');
  });
});

describe('troubleshooting: restart', () => {
  it('shows the restarting message and disables restart and quit', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/restart' }, { statusCode: 200, body: { status: true } }).as(
      'restart',
    );
    markWindow();
    cy.get('[data-testid="restart-button"]').click();
    cy.wait('@restart');
    cy.get('[data-testid="restart-notice"]').should('contain.text', 'Helios is restarting');
    cy.get('[data-testid="restart-button"]').should('be.disabled');
    cy.get('[data-testid="quit-button"]').should('be.disabled');
    cy.get('[data-testid="restart-notice"]', { timeout: 8000 }).should('not.exist');
    cy.get('[data-testid="restart-button"]').should('be.enabled');
    cy.window().its('__marker').should('equal', true);
  });

  it('reloads the page when the host answers with an error status', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/restart' }, { statusCode: 500, body: { status: false } }).as(
      'restart',
    );
    markWindow();
    cy.get('[data-testid="restart-button"]').click();
    cy.wait('@restart');
    windowWasReloaded();
  });

  it('hides the message and reloads the page when the request fails', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/restart' }, { forceNetworkError: true }).as('restart');
    markWindow();
    cy.get('[data-testid="restart-button"]').click();
    cy.get('[data-testid="restart-notice"]').should('not.exist');
    windowWasReloaded();
  });
});

describe('troubleshooting: quit', () => {
  it('asks for confirmation and sends nothing when it is cancelled', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/quit' }, { forceNetworkError: true }).as('quit');
    cy.get('[data-testid="quit-button"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('contain.text', 'Do you really want to quit Helios?');
    cy.get('[data-testid="confirm-cancel"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('not.exist');
    cy.get('[data-testid="quit-notice"]').should('not.exist');
    cy.get('@quit.all').should('have.length', 0);
  });

  it('treats a failing request as the host having exited', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/quit' }, { forceNetworkError: true }).as('quit');
    cy.get('[data-testid="quit-button"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.get('[data-testid="quit-notice"]')
      .should('contain.text', 'Helios has exited.')
      .and('have.attr', 'data-status', 'success');
  });

  it('treats an answer as a failed exit and says so', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/quit' }, { statusCode: 200, body: {} }).as('quit');
    cy.get('[data-testid="quit-button"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.wait('@quit');
    cy.contains('Exit failed!').should('be.visible');
    cy.get('[data-testid="quit-notice"]').should('not.exist');
    cy.get('[data-testid="quit-button"]').should('be.enabled');
  });
});

describe('troubleshooting: display device reset', () => {
  it('posts to the host and shows the success for 5 s', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/reset-display-device-persistence' }, { body: { status: true } }).as(
      'reset',
    );
    cy.get('[data-testid="dd_reset-button"]').click();
    cy.wait('@reset');
    cy.get('[data-testid="dd_reset-notice"]').should('contain.text', 'Success resetting persistence!');
    cy.get('[data-testid="dd_reset-notice"]', { timeout: 8000 }).should('not.exist');
  });

  it('shows the error when the host answers status false', () => {
    visitPage();
    cy.intercept({ method: 'POST', pathname: '/api/reset-display-device-persistence' }, { body: { status: false } });
    cy.get('[data-testid="dd_reset-button"]').click();
    cy.get('[data-testid="dd_reset-notice"]')
      .should('contain.text', 'Error while resetting persistence!')
      .and('have.attr', 'data-status', 'danger');
  });
});

describe('troubleshooting: logs', () => {
  const LOG = ['Info: started', 'Warning: slow', 'info: lower', 'Info: ready'].join('\n');

  it('loads the log once and then every 5 s', () => {
    stubServerApi({ overrides: { 'GET /api/logs': { statusCode: 200, body: 'first read' } } });
    let reads = 0;
    cy.intercept({ method: 'GET', pathname: '/api/logs' }, (req) => {
      reads += 1;
      req.reply({ statusCode: 200, body: `read number ${reads}` });
    }).as('logPoll');
    cy.visit('/troubleshooting');
    cy.get('[data-testid="logs-output"]').should('have.text', 'read number 1');
    cy.get('[data-testid="logs-output"]', { timeout: 9000 }).should('have.text', 'read number 2');
    cy.get('[data-testid="logs-output"]', { timeout: 9000 }).should('have.text', 'read number 3');
  });

  it('decodes the body with the charset of the Content-Type header', () => {
    stubServerApi();
    const windows1252 = new Uint8Array([0x63, 0x61, 0x66, 0xe9, 0x20, 0x6f, 0x6b]); // "cafe ok" with e-acute
    cy.intercept(
      { method: 'GET', pathname: '/api/logs' },
      { statusCode: 200, body: windows1252.buffer, headers: { 'Content-Type': 'text/plain; charset=windows-1252' } },
    );
    cy.visit('/troubleshooting');
    cy.get('[data-testid="logs-output"]').should('have.text', 'café ok');
  });

  it('filters the lines by a case-sensitive text', () => {
    visitPage({ log: LOG });
    cy.get('[data-testid="logs-output"]').should('have.text', LOG);
    cy.get('[data-testid="logs-filter-input"]').type('Info');
    cy.get('[data-testid="logs-output"]').should('have.text', 'Info: started\nInfo: ready');
    cy.get('[data-testid="logs-filter-input"]').clear().type('info');
    cy.get('[data-testid="logs-output"]').should('have.text', 'info: lower');
    cy.get('[data-testid="logs-filter-input"]').clear();
    cy.get('[data-testid="logs-output"]').should('have.text', LOG);
  });

  it('copies the filtered text to the clipboard', () => {
    visitPage({ log: LOG });
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves();
    });
    cy.get('[data-testid="logs-output"]').should('have.text', LOG);
    cy.get('[data-testid="logs-copy"]').click();
    cy.get('@copy').should('have.been.calledWith', LOG);
    cy.get('[data-testid="logs-filter-input"]').type('Warning');
    cy.get('[data-testid="logs-copy"]').click();
    cy.get('@copy').should('have.been.calledWith', 'Warning: slow');
  });

  it('is a scrollable monospace box', () => {
    visitPage({ log: Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n') });
    cy.get('[data-testid="logs-output"]')
      .should('have.css', 'overflow-y', 'auto')
      .and('have.css', 'font-family')
      .and('match', /mono/i);
    cy.get('[data-testid="logs-output"]').should(($pre) => {
      const el = $pre[0] as HTMLElement;
      expect(el.scrollHeight).to.be.greaterThan(el.clientHeight);
    });
  });
});
