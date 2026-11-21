import { stubServerApi, type StubPlatform } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function visitAdvanced(platform: StubPlatform = 'windows') {
  stubServerApi({ platform, overrides: { ...SAVED } });
  cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  cy.visit('/config#advanced');
  cy.get('[data-testid="config-advanced"]').should('be.visible');
}

function choose(id: string, option: string | RegExp) {
  cy.get(`#${id}`).click();
  cy.contains('[role="option"]', option).click();
}

describe('config: Advanced tab', () => {
  it('shows the verbatim defaults', () => {
    visitAdvanced();
    cy.get('#fec_percentage').should('have.value', '20');
    cy.get('#qp').should('have.value', '28');
    cy.get('#min_threads').should('have.value', '2').and('have.attr', 'min', '1');
    cy.get('#limit_framerate').should('be.checked');
    cy.get('#legacy_ordering').should('not.be.checked');
    cy.get('#ignore_encoder_probe_failure').should('not.be.checked');
    cy.get('#capture').should('contain.text', 'Autodetect');
    cy.get('#encoder').should('contain.text', 'Autodetect');
  });

  it('offers the Windows capture methods and encoders', () => {
    visitAdvanced('windows');
    cy.get('#capture').click();
    cy.get('[role="option"]').should('have.length', 3);
    cy.contains('[role="option"]', 'Windows.Graphics.Capture (beta)').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('#encoder').click();
    cy.get('[role="option"]').should('have.length', 5);
    cy.get('body').type('{esc}');
  });

  it('hides the capture field on macOS', () => {
    visitAdvanced('macos');
    cy.get('#capture').should('not.exist');
    cy.get('#encoder').click();
    cy.contains('[role="option"]', 'VideoToolbox').should('be.visible');
  });

  it('saves the edited options with the legacy value spelling', () => {
    visitAdvanced('windows');
    cy.get('#qp').clear().type('30');
    cy.get('#min_threads').clear().type('4');
    cy.get('#fec_percentage').clear().type('35');
    cy.get('#limit_framerate').click({ force: true });
    choose('hevc_mode', /HEVC Main and Main10/);
    choose('av1_mode', /AV1 Main 8-bit profile/);
    choose('capture', 'Desktop Duplication API');
    choose('encoder', 'Intel QuickSync');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body').should('deep.include', {
      qp: 30,
      min_threads: 4,
      fec_percentage: '35',
      limit_framerate: 'disabled',
      hevc_mode: '3',
      av1_mode: '2',
      capture: 'ddx',
      encoder: 'quicksync',
    });
  });
});
