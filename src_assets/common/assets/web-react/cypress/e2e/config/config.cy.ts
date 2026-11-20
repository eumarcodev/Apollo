import { stubServerApi, type StubPlatform } from '../../support/api';

const TABS: Record<StubPlatform, string[]> = {
  windows: ['general', 'input', 'av', 'network', 'files', 'advanced', 'nv', 'qsv', 'amd', 'pyrowave', 'sw'],
  linux: ['general', 'input', 'av', 'network', 'files', 'advanced', 'nv', 'vaapi', 'sw'],
  macos: ['general', 'input', 'av', 'network', 'files', 'advanced', 'vt', 'sw'],
};

/** What the page posts for the fixture: the defaults are stripped, the non-tab keys and strings stay. */
const UNCHANGED_PAYLOAD = { update_repo: 'eumarcodev/Helios-Server', sunshine_name: 'E2E Host', min_log_level: '2' };

function tabIds() {
  return cy
    .get('[data-testid="config-tabs"] [role="tab"]')
    .then(($tabs) => [...$tabs].map((tab) => tab.getAttribute('data-testid')!.replace('config-tab-', '')));
}

function markWindow() {
  cy.window().then((win) => {
    (win as unknown as Record<string, unknown>)['__beforeReload'] = true;
  });
}

describe('config: page core', () => {
  for (const platform of Object.keys(TABS) as StubPlatform[]) {
    it(`shows the ${platform} tabs, General first`, () => {
      stubServerApi({ platform });
      cy.visit('/config');
      cy.wait('@config');
      tabIds().should('deep.equal', TABS[platform]);
      cy.get('[data-testid="config-tab-general"]').should('have.attr', 'aria-selected', 'true');
      cy.get('[data-testid="config-panel-general"] h2').should('have.text', 'General');
      cy.get('[data-testid="config-tab-placeholder"]').should('have.attr', 'data-tab', 'general');
    });
  }

  it('translates the title and the tab names to pt_BR', () => {
    stubServerApi({ locale: 'pt_BR' });
    cy.visit('/config');
    cy.get('h1').should('have.text', 'Configuração');
    cy.get('[data-testid="config-tab-av"]').should('have.text', 'Áudio/Vídeo');
    cy.get('[data-testid="config-tab-sw"]').should('have.text', 'Codificador de software');
    cy.get('[data-testid="config-save"]').should('contain.text', 'Salvar');
  });

  it('opens the tab named in the hash, and the tab of an option', () => {
    stubServerApi();
    cy.visit('/config#network');
    cy.get('[data-testid="config-tab-network"]').should('have.attr', 'aria-selected', 'true');
    cy.window().then((win) => {
      win.location.hash = '#nvenc_preset';
    });
    cy.get('[data-testid="config-tab-nv"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="config-panel-nv"] h2').should('have.text', 'NVIDIA NVENC Encoder');
  });

  it('ignores a hash for a tab the platform hides', () => {
    stubServerApi({ platform: 'linux' });
    cy.visit('/config#amd_usage');
    cy.get('[data-testid="config-tab-general"]').should('have.attr', 'aria-selected', 'true');
  });

  it('switches tabs on click and clears the hash', () => {
    stubServerApi();
    cy.visit('/config#input');
    cy.get('[data-testid="config-tab-advanced"]').click();
    cy.get('[data-testid="config-tab-advanced"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="config-panel-advanced"] h2').should('have.text', 'Advanced');
    cy.location('hash').should('eq', '');
  });

  it('saves only what differs from the defaults and offers Apply', () => {
    stubServerApi({ overrides: { 'POST /api/config': { statusCode: 200, body: { status: true } } } });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config');
    cy.get('[data-testid="config-apply"]').should('not.exist');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').then(({ request }) => {
      expect(request.headers['content-type']).to.contain('application/json');
      expect(request.body).to.deep.equal(UNCHANGED_PAYLOAD);
    });
    cy.get('[data-testid="config-apply-note"]').should(
      'have.text',
      "Success! Click 'Apply' to restart Helios and apply changes. This will terminate any running sessions.",
    );
    cy.get('[data-testid="config-apply"]').should('be.visible');
  });

  it('shows nothing when the save fails', () => {
    stubServerApi({ overrides: { 'POST /api/config': { statusCode: 500, body: { status: false } } } });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 500);
    cy.get('[data-testid="config-apply-note"]').should('not.exist');
    cy.get('[data-testid="config-apply"]').should('not.exist');
  });

  it('applies: saves again, restarts the host and hides the note after 5 s', () => {
    stubServerApi({
      overrides: {
        'POST /api/config': { statusCode: 200, body: { status: true } },
        'POST /api/restart': { statusCode: 200, body: { status: true } },
      },
    });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.intercept({ method: 'POST', pathname: '/api/restart' }).as('restart');
    cy.visit('/config');
    markWindow();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save');
    cy.get('[data-testid="config-apply"]').click();
    cy.wait('@save').its('request.body').should('deep.equal', UNCHANGED_PAYLOAD);
    cy.wait('@restart').its('request.headers.content-type').should('contain', 'application/json');
    cy.get('[data-testid="config-restart-note"]').should(
      'have.text',
      'Success! Helios is restarting to apply changes.',
    );
    cy.get('[data-testid="config-apply"]').should('not.exist');
    cy.get('[data-testid="config-restart-note"]', { timeout: 8000 }).should('not.exist');
    cy.get('[data-testid="config-apply-note"]').should('not.exist');
    cy.window().its('__beforeReload').should('eq', true);
  });

  it('reloads the page when the restart is refused', () => {
    stubServerApi({
      overrides: {
        'POST /api/config': { statusCode: 200, body: { status: true } },
        'POST /api/restart': { statusCode: 400, body: { status: false } },
      },
    });
    cy.visit('/config');
    markWindow();
    cy.get('[data-testid="config-save"]').click();
    cy.get('[data-testid="config-apply"]').click();
    cy.window().should('not.have.property', '__beforeReload');
    cy.get('[data-testid="config-tabs"]').should('be.visible');
  });

  it('reloads the page 1 s after a network error on restart', () => {
    stubServerApi({
      overrides: {
        'POST /api/config': { statusCode: 200, body: { status: true } },
        'POST /api/restart': { forceNetworkError: true },
      },
    });
    cy.visit('/config');
    markWindow();
    cy.get('[data-testid="config-save"]').click();
    cy.get('[data-testid="config-apply"]').click();
    cy.get('[data-testid="config-restart-note"]').should('be.visible');
    cy.window().should('not.have.property', '__beforeReload');
    cy.get('[data-testid="config-tabs"]').should('be.visible');
  });
});
