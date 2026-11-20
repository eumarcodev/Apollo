import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

const MARKER = 'helios-e2e-audio-sink';

// Changes one option of the Audio/Video tab, saves (never Apply: no restart) and restores the snapshot afterwards.
describe('installed config: Audio/Video tab of the installed host', () => {
  let snapshot: ConfigSnapshot | undefined;

  before(() => {
    loginInstalled();
    snapshotConfig().then((value) => {
      snapshot = value;
    });
  });

  after(() => {
    if (snapshot) {
      loginInstalled();
      restoreConfig(snapshot);
    }
  });

  beforeEach(() => {
    loginInstalled();
  });

  it('renders the fields of the host platform', () => {
    cy.request<{ platform: string }>('/api/config')
      .its('body.platform')
      .then((platform) => {
        cy.visit('/config#audio_sink');
        cy.get('[data-testid="config-tab-av"]').should('have.attr', 'aria-selected', 'true');
        for (const id of ['audio_sink', 'output_name', 'max_bitrate', 'minimum_fps_target', 'fallback_mode']) {
          cy.get(`#${id}`).should('exist');
        }
        cy.get('#stream_audio').should('exist');
        cy.get('#virtual_sink').should(platform === 'windows' ? 'exist' : 'not.exist');
        cy.get('#adapter_name').should(platform === 'macos' ? 'not.exist' : 'exist');
        cy.get('[data-testid="vdisplay-status"]').should(platform === 'windows' ? 'be.visible' : 'not.exist');
      });
  });

  it('saves a changed audio sink and the host reports it', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config#audio_sink');
    cy.get('#audio_sink').clear();
    cy.get('#audio_sink').type(MARKER);
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.request<Record<string, unknown>>('/api/config').its('body.audio_sink').should('eq', MARKER);
  });
});
