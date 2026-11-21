import { stubServerApi, type StubPlatform } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

/** `GET /api/config` body of the fixture with a given virtual display status. */
function configWith(platform: StubPlatform, extra: Record<string, unknown>) {
  return {
    statusCode: 200,
    body: {
      status: true,
      platform,
      version: '1.0.0-e2e',
      update_repo: 'eumarcodev/Helios-Server',
      locale: 'en',
      sunshine_name: 'E2E Host',
      ...extra,
    },
  };
}

function openAvTab() {
  cy.visit('/config#audio_sink');
  cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-testid="config-panel-av"] h2').should('have.text', 'Audio/Video');
}

describe('config: Audio/Video tab (Windows)', () => {
  beforeEach(() => {
    stubServerApi({ overrides: SAVED });
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  });

  it('opens from the hash of an option and shows every Windows field', () => {
    openAvTab();
    for (const id of [
      'audio_sink',
      'virtual_sink',
      'install_steam_audio_drivers',
      'keep_sink_default',
      'auto_capture_sink',
      'stream_audio',
      'adapter_name',
      'output_name',
      'max_bitrate',
      'minimum_fps_target',
      'fallback_mode',
      'headless_mode',
      'double_refreshrate',
      'isolated_virtual_display_option',
    ]) {
      cy.get(`#${id}`).should('exist');
    }
    cy.get('#audio_sink').should('have.attr', 'placeholder', 'Speakers (High Definition Audio Device)');
    cy.get('#output_name').should('have.attr', 'placeholder', '{de9bb7e2-186e-505b-9e93-f48793333810}');
    cy.contains('tools\\audio-info.exe').should('be.visible');
    cy.contains('tools\\dxgi-info.exe').should('be.visible');
    cy.get('[data-testid="vdisplay-status"]').should('contain.text', 'SudoVDA Driver status: Ready');
  });

  it('saves only the edited options, with the legacy value spelling', () => {
    openAvTab();
    cy.get('#audio_sink').type('Speakers');
    cy.get('#max_bitrate').clear();
    cy.get('#max_bitrate').type('5000');
    cy.get('#minimum_fps_target').clear();
    cy.get('#minimum_fps_target').type('60');
    cy.get('#fallback_mode').type('1920x1080x60');
    cy.contains('label', 'Stream Audio').click();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body').should('deep.equal', {
      update_repo: 'eumarcodev/Helios-Server',
      sunshine_name: 'E2E Host',
      audio_sink: 'Speakers',
      max_bitrate: 5000,
      minimum_fps_target: 60,
      fallback_mode: '1920x1080x60',
      stream_audio: 'disabled',
    });
  });

  it('validates the fallback mode live and the save guard drops a decimal refresh rate', () => {
    openAvTab();
    cy.get('#fallback_mode').should('not.have.attr', 'aria-invalid', 'true');
    cy.get('#fallback_mode').type('1920x1080');
    cy.get('#fallback_mode').should('have.attr', 'aria-invalid', 'true');
    cy.contains('Invalid fallback mode. Format: [Width]x[Height]x[FPS]').should('be.visible');
    cy.get('#fallback_mode').type('x59.94');
    cy.get('#fallback_mode').should('not.have.attr', 'aria-invalid', 'true');
    cy.contains('Invalid fallback mode').should('not.exist');
    // Live pattern accepts 59.94, the save guard (/^\d+x\d+x\d+$/) does not: the last valid value (empty) is kept.
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('request.body').should('not.have.property', 'fallback_mode');
  });

  it('shows the pt_BR texts', () => {
    stubServerApi({ locale: 'pt_BR', overrides: SAVED });
    cy.visit('/config#audio_sink');
    cy.get('[data-testid="config-panel-av"]').should('be.visible');
    cy.get('[data-testid="vdisplay-status"]').should('contain.text', 'Status do driver SudoVDA: Pronto');
    cy.get('label[for="max_bitrate"]').should('have.text', 'Taxa de bits máximo');
  });
});

describe('config: Audio/Video SudoVDA status', () => {
  const STATES: Array<[number | string, string, 'ok' | 'warning']> = [
    [0, 'Ready', 'ok'],
    [1, 'Unknown', 'warning'],
    [-1, 'Uninitialized', 'warning'],
    [-2, 'Version Incompatible', 'warning'],
    [-3, 'Watchdog Failed', 'warning'],
    ['0', 'Ready', 'warning'],
  ];

  for (const [status, text, state] of STATES) {
    it(`shows ${JSON.stringify(status)} as "${text}" (${state})`, () => {
      stubServerApi({ overrides: { 'GET /api/config': configWith('windows', { vdisplayStatus: status }) } });
      cy.visit('/config#audio_sink');
      cy.get('[data-testid="vdisplay-status"]')
        .should('have.attr', 'data-state', state)
        .and('contain.text', `SudoVDA Driver status: ${text}`);
      cy.contains('Please ensure SudoVDA driver is installed to the latest version and enabled properly.').should(
        state === 'ok' ? 'not.exist' : 'be.visible',
      );
    });
  }
});

describe('config: Audio/Video tab (Linux and macOS)', () => {
  it('Linux hides the Windows options and shows the Linux help', () => {
    stubServerApi({ platform: 'linux' });
    cy.visit('/config#audio_sink');
    cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
    for (const id of ['virtual_sink', 'headless_mode', 'double_refreshrate', 'isolated_virtual_display_option']) {
      cy.get(`#${id}`).should('not.exist');
    }
    cy.get('[data-testid="vdisplay-status"]').should('not.exist');
    cy.get('#stream_audio').should('exist');
    cy.get('#adapter_name').should('have.attr', 'placeholder', '/dev/dri/renderD128');
    cy.get('#output_name').should('have.attr', 'placeholder', '0');
    cy.get('label[for="output_name"]').should('have.text', 'Display number');
    cy.contains('pactl info | grep Source').should('be.visible');
    cy.contains('Info: Detected display: HDMI-0 (id: 1) connected: true').should('be.visible');
  });

  it('macOS has no adapter name and links the audio loopback drivers', () => {
    stubServerApi({ platform: 'macos' });
    cy.visit('/config#audio_sink');
    cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#adapter_name').should('not.exist');
    cy.get('#virtual_sink').should('not.exist');
    cy.get('#audio_sink').should('have.attr', 'placeholder', 'BlackHole 2ch');
    cy.contains('a', 'Soundflower').should('have.attr', 'href', 'https://github.com/mattingalls/Soundflower');
    cy.contains('a', 'BlackHole').should('have.attr', 'href', 'https://github.com/ExistentialAudio/BlackHole');
    cy.contains('Info: Detected display: Monitor-0 (id: 3) connected: true').should('be.visible');
  });
});
