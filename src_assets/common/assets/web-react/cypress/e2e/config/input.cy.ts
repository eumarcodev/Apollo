import type { StaticResponse } from 'cypress/types/net-stubbing';
import { stubServerApi, type StubPlatform } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function choose(id: string, option: string | RegExp) {
  cy.get(`#${id}`).click();
  cy.contains('[role="option"]', option).click();
}

function visitInput(platform: StubPlatform = 'windows', overrides: Record<string, StaticResponse> = SAVED) {
  stubServerApi({ platform, overrides: { ...overrides } });
  cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  cy.visit('/config#input');
  cy.get('[data-testid="config-input"]').should('be.visible');
}

describe('config: Input tab', () => {
  it('shows the loaded values and the defaults on Windows', () => {
    visitInput('windows');
    cy.get('#controller').should('be.checked');
    cy.get('#gamepad').should('contain.text', 'Automatic');
    cy.get('#back_button_timeout').should('have.value', '-1').and('have.attr', 'placeholder', '-1');
    cy.get('#key_repeat_delay').should('have.value', '500');
    cy.get('#key_repeat_frequency').should('have.value', '24.9');
    cy.get('#always_send_scancodes').should('be.checked');
    cy.get('#key_rightalt_to_key_win').should('not.be.checked');
    cy.get('#forward_rumble').should('be.checked');
    cy.get('#enable_input_only_mode').should('not.be.checked');
  });

  it('shows the automatic gamepad options and the DS4 option on Windows', () => {
    visitInput('windows');
    cy.get('[data-testid="config-gamepad-section"]').should('contain.text', 'Automatic selection options');
    cy.get('#motion_as_ds4').should('be.checked');
    cy.get('#touchpad_as_ds4').should('be.checked');
    cy.get('#ds4_back_as_touchpad_click').should('be.checked');
    cy.get('#ds5_inputtino_randomize_mac').should('not.exist');
  });

  it('offers the Linux gamepad types and the DS5 option on Linux', () => {
    visitInput('linux');
    cy.get('#gamepad').click();
    cy.get('[role="option"]').should('have.length', 4);
    cy.contains('[role="option"]', 'DS5 (PS5)').should('be.visible');
    cy.contains('[role="option"]', 'Nintendo Pro (Switch)').should('be.visible');
    cy.contains('[role="option"]', 'XOne (Xbox One)').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('#ds5_inputtino_randomize_mac').should('exist');
    cy.get('#ds4_back_as_touchpad_click').should('not.exist');
    cy.get('#key_repeat_delay').should('not.exist');
    cy.get('#forward_rumble').should('not.exist');
  });

  it('hides the gamepad select on macOS', () => {
    visitInput('macos');
    cy.get('#gamepad').should('not.exist');
    cy.get('#controller').should('be.checked');
    cy.get('#back_button_timeout').should('exist');
    cy.get('#motion_as_ds4').should('not.exist');
  });

  it('hides the controller options while the controller is disabled', () => {
    cy.fixture('config.json').then((config: Record<string, unknown>) => {
      stubServerApi({
        overrides: { ...SAVED, 'GET /api/config': { statusCode: 200, body: { ...config, controller: 'disabled' } } },
      });
    });
    cy.visit('/config#input');
    cy.get('[data-testid="config-input"]').should('be.visible');
    cy.get('#controller').should('not.be.checked');
    cy.get('#gamepad').should('not.exist');
    cy.get('#back_button_timeout').should('not.exist');
    cy.get('[data-testid="config-gamepad-section"]').should('not.exist');
  });

  it('shows the DS4 section when DS4 is picked on Windows', () => {
    visitInput('windows');
    choose('gamepad', 'DS4 (PS4)');
    cy.get('[data-testid="config-gamepad-section"]').should('contain.text', 'DS4 selection options');
    cy.get('#motion_as_ds4').should('not.exist');
    cy.get('#ds4_back_as_touchpad_click').should('exist');
  });

  it('saves the edited timeout and the picked gamepad type as the legacy spelling', () => {
    visitInput('linux');
    choose('gamepad', 'DS5 (PS5)');
    cy.get('#back_button_timeout').clear();
    cy.get('#back_button_timeout').type('2000');
    cy.get('#mouse').click({ force: true });
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.include', { gamepad: 'ds5', back_button_timeout: '2000', mouse: 'disabled' });
  });

  it('hides the mouse sub-options when the mouse is disabled', () => {
    visitInput('windows');
    cy.get('#high_resolution_scrolling').should('exist');
    cy.get('#mouse').click({ force: true });
    cy.get('#high_resolution_scrolling').should('not.exist');
    cy.get('#native_pen_touch').should('not.exist');
  });

  it('translates the labels to pt_BR', () => {
    stubServerApi({ locale: 'pt_BR', overrides: SAVED });
    cy.visit('/config#input');
    cy.get('[data-testid="config-input"]').should('be.visible');
    cy.contains('label', 'Tempo limite de emulação do botão Início/Guia').should('be.visible');
  });

  it('scrolls to an option of the tab from the hash', () => {
    stubServerApi({ overrides: SAVED });
    cy.visit('/config#forward_rumble');
    cy.get('[data-testid="config-tab-input"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#forward_rumble').should('be.visible');
  });
});
