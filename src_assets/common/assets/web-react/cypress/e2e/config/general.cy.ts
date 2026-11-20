import { stubServerApi, type StubPlatform } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function choose(id: string, option: string | RegExp) {
  cy.get(`#${id}`).click();
  cy.contains('[role="option"]', option).click();
}

function visitGeneral(platform: StubPlatform = 'windows', overrides = SAVED) {
  stubServerApi({ platform, overrides: { ...overrides } });
  cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  cy.visit('/config');
  cy.get('[data-testid="config-general"]').should('be.visible');
}

describe('config: General tab', () => {
  it('shows the loaded values and the defaults', () => {
    visitGeneral();
    cy.get('#sunshine_name').should('have.value', 'E2E Host').and('have.attr', 'placeholder', 'Helios');
    cy.get('#locale').should('contain.text', 'English');
    cy.get('#min_log_level').should('contain.text', 'Info');
    cy.get('#update_channel').should('contain.text', 'Automatic');
    cy.get('#enable_pairing').should('be.checked');
    cy.get('#enable_discovery').should('be.checked');
    cy.get('#system_tray').should('be.checked');
    cy.get('#hide_tray_controls').should('not.be.checked');
  });

  it('offers only English and Portuguese (Brazil) for the locale', () => {
    visitGeneral();
    cy.get('#locale').click();
    cy.get('[role="option"]').should('have.length', 2);
    cy.contains('[role="option"]', 'Português (Brasil)').should('be.visible');
  });

  it('keeps a locale outside the offered ones when saving', () => {
    cy.fixture('config.json').then((config: Record<string, unknown>) => {
      stubServerApi({
        overrides: { ...SAVED, 'GET /api/config': { statusCode: 200, body: { ...config, locale: 'de' } } },
      });
    });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config');
    cy.get('#locale').should('contain.text', 'de');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body.locale').should('eq', 'de');
  });

  it('saves the edited options with the legacy value spelling', () => {
    visitGeneral();
    cy.get('#sunshine_name').clear();
    cy.get('#sunshine_name').type('My PC');
    choose('min_log_level', 'Warning');
    choose('update_channel', /^Stable only/);
    choose('locale', 'Português (Brasil)');
    cy.get('#enable_pairing').click({ force: true });
    cy.get('#hide_tray_controls').click({ force: true });
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body').should('deep.equal', {
      update_repo: 'eumarcodev/Helios-Server',
      sunshine_name: 'My PC',
      min_log_level: '3',
      update_channel: 'stable',
      locale: 'pt_BR',
      enable_pairing: 'disabled',
      hide_tray_controls: 'enabled',
    });
  });

  it('edits the prep, state and server command lists on Windows', () => {
    visitGeneral('windows');
    cy.get('[data-testid="global_prep_cmd-add"]').click();
    cy.get('#global_prep_cmd-do-0').type('echo up');
    cy.get('#global_prep_cmd-undo-0').type('echo down');
    cy.get('#global_prep_cmd-elevated-0').click({ force: true });
    cy.get('[data-testid="global_prep_cmd-insert-0"]').click();
    cy.get('[data-testid="global_prep_cmd-row-0"]').should('exist');
    cy.get('[data-testid="global_prep_cmd-remove-0"]').click();
    cy.get('[data-testid="global_state_cmd-add"]').click();
    cy.get('#global_state_cmd-do-0').type('echo resume');
    cy.get('[data-testid="server_cmd-add"]').click();
    cy.get('#server_cmd-name-0').type('Reboot');
    cy.get('#server_cmd-cmd-0').type('shutdown /r').should('have.class', 'font-mono');
    // A row with no content is dropped on save (legacy serialize).
    cy.get('[data-testid="server_cmd-add"]').click();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.include', {
        global_prep_cmd: [{ do: 'echo up', undo: 'echo down', elevated: true }],
        global_state_cmd: [{ do: 'echo resume', undo: '', elevated: false }],
        server_cmd: [{ name: 'Reboot', cmd: 'shutdown /r', elevated: false }],
      });
  });

  it('has no elevated column outside Windows', () => {
    visitGeneral('linux');
    cy.get('[data-testid="global_prep_cmd-add"]').click();
    cy.get('[data-testid="global_prep_cmd-row-0"]').should('exist');
    cy.get('#global_prep_cmd-elevated-0').should('not.exist');
    cy.get('[data-testid="server_cmd-add"]').click();
    cy.get('#server_cmd-elevated-0').should('not.exist');
    cy.get('#global_prep_cmd-do-0').type('echo x');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body.global_prep_cmd')
      .should('deep.equal', [{ do: 'echo x', undo: '' }]);
  });

  it('links Learn More to the Helios docs', () => {
    visitGeneral();
    cy.get('[data-testid="server_cmd-learn-more"]')
      .should('have.attr', 'href', 'https://github.com/eumarcodev/Helios-Server/tree/master/docs')
      .and('have.attr', 'target', '_blank');
  });

  it('translates the fields to pt_BR', () => {
    stubServerApi({ locale: 'pt_BR', overrides: SAVED });
    cy.visit('/config');
    cy.get('[data-testid="config-general"]').should('be.visible');
    cy.contains('label', 'Nome do servidor').should('be.visible');
  });

  it('scrolls to an option of the tab from the hash', () => {
    stubServerApi({ overrides: SAVED });
    cy.visit('/config#hide_tray_controls');
    cy.get('[data-testid="config-tab-general"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#hide_tray_controls').should('be.visible');
  });
});
