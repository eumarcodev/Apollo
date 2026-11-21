import { stubServerApi } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function pick(id: string, option: string) {
  cy.get(`#${id}`).click();
  cy.contains('[role="option"]', option).click();
}

function openOptions() {
  cy.visit('/config#dd_hdr_option');
  cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
  cy.contains('button', 'Advanced display device options').click();
}

describe('config: display device options (Windows)', () => {
  beforeEach(() => {
    stubServerApi({ overrides: SAVED });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  });

  it('keeps the options hidden until the configuration is active, never renders the HDR toggle delay', () => {
    openOptions();
    cy.get('#dd_configuration_option').should('be.visible');
    cy.get('#dd_hdr_option').should('exist');
    cy.get('#dd_resolution_option').should('not.exist');
    cy.get('#dd_mode_remapping').should('not.exist');
    cy.get('#dd_wa_hdr_toggle_delay').should('not.exist');
    pick('dd_configuration_option', 'Activate the display automatically');
    for (const id of [
      'dd_resolution_option',
      'dd_refresh_rate_option',
      'dd_config_revert_delay',
      'dd_config_revert_on_disconnect',
      'dd_mode_remapping',
    ]) {
      cy.get(`#${id}`).should('exist');
    }
    cy.get('#dd_config_revert_delay').should('have.attr', 'placeholder', '3000').and('have.value', '3000');
    cy.get('#dd_manual_resolution').should('not.exist');
    pick('dd_resolution_option', 'Use manually entered resolution');
    cy.get('#dd_manual_resolution').should('have.attr', 'placeholder', '2560x1440');
    pick('dd_refresh_rate_option', 'Use manually entered refresh rate');
    cy.get('#dd_manual_refresh_rate').should('have.attr', 'placeholder', '59.9558');
    // Both options are no longer "auto": nothing to remap.
    cy.get('#dd_mode_remapping').should('not.exist');
  });

  it('edits the remapping table by type and saves it as JSON', () => {
    openOptions();
    pick('dd_configuration_option', 'Activate the display automatically');
    cy.get('[data-testid="dd-remapping"]').should('have.attr', 'data-remapping-type', 'mixed');
    cy.get('[data-testid="dd-remapping-add"]').click();
    cy.get('[data-testid="dd-remapping-row-0"] input').should('have.length', 4);
    cy.get('[data-testid="dd-remapping-0-requested_resolution"]').type('1920x1080');
    cy.get('[data-testid="dd-remapping-0-final_resolution"]').type('2560x1440');
    pick('dd_refresh_rate_option', 'Use manually entered refresh rate');
    cy.get('[data-testid="dd-remapping"]').should('have.attr', 'data-remapping-type', 'resolution_only');
    cy.get('[data-testid="dd-remapping-add"]').click();
    cy.get('[data-testid="dd-remapping-row-0"] input').should('have.length', 2);
    cy.get('[data-testid="dd-remapping-0-requested_resolution"]').type('1280x720');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should((body) => {
        expect(body.dd_configuration_option).to.eq('ensure_active');
        expect(body.dd_refresh_rate_option).to.eq('manual');
        expect(body.dd_mode_remapping).to.deep.eq({
          mixed: [
            {
              requested_fps: '',
              final_refresh_rate: '',
              requested_resolution: '1920x1080',
              final_resolution: '2560x1440',
            },
          ],
          resolution_only: [{ requested_resolution: '1280x720', final_resolution: '' }],
          refresh_rate_only: [],
        });
      });
  });

  it('saves the HDR option', () => {
    openOptions();
    pick('dd_hdr_option', 'Do not change HDR settings');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body.dd_hdr_option').should('eq', 'disabled');
  });

  it('shows the pt_BR texts', () => {
    stubServerApi({ locale: 'pt_BR', overrides: SAVED });
    cy.visit('/config#dd_hdr_option');
    cy.contains('button', 'Opções avançadas da tela').should('be.visible');
  });
});

describe('config: display device options (Linux and macOS)', () => {
  for (const platform of ['linux', 'macos'] as const) {
    it(`${platform} shows none of them`, () => {
      stubServerApi({ platform });
      cy.visit('/config#audio_sink');
      cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
      cy.get('[data-testid="av-display-device"]').should('not.exist');
      cy.get('#dd_hdr_option').should('not.exist');
    });
  }
});
