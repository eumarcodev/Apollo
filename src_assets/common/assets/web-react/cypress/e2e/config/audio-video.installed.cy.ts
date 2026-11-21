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

  it('saves a changed HDR option on Windows and the host reports it', () => {
    cy.request<{ platform: string; dd_hdr_option?: string }>('/api/config').then(({ body }) => {
      if (body.platform !== 'windows') {
        cy.visit('/config#audio_sink');
        cy.get('#dd_hdr_option').should('not.exist');
        return;
      }
      const next = body.dd_hdr_option === 'disabled' ? 'Switch on/off the HDR mode' : 'Do not change HDR settings';
      const expected = body.dd_hdr_option === 'disabled' ? 'auto' : 'disabled';
      cy.intercept({ method: 'POST', pathname: '/api/config' }).as('saveHdr');
      cy.visit('/config#dd_hdr_option');
      cy.contains('button', 'Advanced display device options').should('be.visible');
      cy.get('#dd_hdr_option').click();
      cy.contains('[role="option"]', next).click();
      cy.get('[data-testid="config-save"]').click();
      cy.wait('@saveHdr').its('response.statusCode').should('eq', 200);
      cy.request<Record<string, unknown>>('/api/config').its('body.dd_hdr_option').should('eq', expected);
    });
  });
});
