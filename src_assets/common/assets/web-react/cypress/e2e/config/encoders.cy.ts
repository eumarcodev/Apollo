import { stubServerApi, type StubLocale, type StubPlatform } from '../../support/api';

const SAVED = { 'POST /api/config': { statusCode: 200, body: { status: true } } } as const;

function openTab(hash: string, tab: string, platform?: StubPlatform, locale?: StubLocale) {
  stubServerApi({ ...(platform ? { platform } : {}), ...(locale ? { locale } : {}), overrides: SAVED });
  cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
  cy.visit(`/config#${hash}`);
  cy.get(`[data-testid="config-tab-${tab}"]`).should('have.attr', 'aria-selected', 'true');
}

const BASE_BODY = { update_repo: 'eumarcodev/Helios-Server', helios_name: 'E2E Host' };

describe('config: NVENC tab', () => {
  it('opens from the hash of an option and shows every Windows field with distinct ids', () => {
    openTab('nvenc_intra_refresh', 'nv', 'windows');
    for (const id of [
      'nvenc_preset',
      'nvenc_twopass',
      'nvenc_spatial_aq',
      'nvenc_vbv_increase',
      'nvenc_realtime_hags',
      'nvenc_latency_over_power',
      'nvenc_opengl_vulkan_on_dxgi',
      'nvenc_h264_cavlc',
      'nvenc_intra_refresh',
    ]) {
      cy.get(`[id="${id}"]`).should('have.length', 1);
    }
    cy.contains('a', 'HAGS').should('have.attr', 'href');
  });

  it('saves only the edited options', () => {
    openTab('nvenc_preset', 'nv', 'windows');
    cy.get('#nvenc_preset').click();
    cy.contains('[role="option"]', 'P7 (slowest)').click();
    cy.get('#nvenc_vbv_increase').clear();
    cy.get('#nvenc_vbv_increase').type('150');
    cy.contains('label', 'Spatial AQ').click();
    cy.get('#nvenc_intra_refresh').click();
    cy.contains('[role="option"]', 'Enabled').click();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.equal', {
        ...BASE_BODY,
        nvenc_preset: '7',
        nvenc_vbv_increase: 150,
        nvenc_spatial_aq: 'enabled',
        nvenc_intra_refresh: 'enabled',
      });
  });

  it('hides the Windows-only options on Linux', () => {
    openTab('nvenc_preset', 'nv', 'linux');
    for (const id of ['nvenc_realtime_hags', 'nvenc_latency_over_power', 'nvenc_opengl_vulkan_on_dxgi']) {
      cy.get(`#${id}`).should('not.exist');
    }
    cy.get('#nvenc_h264_cavlc').should('exist');
  });
});

describe('config: other encoder tabs', () => {
  it('QuickSync and AMF render and save', () => {
    openTab('qsv_preset', 'qsv', 'windows');
    cy.get('#qsv_coder').should('exist');
    cy.get('#qsv_slow_hevc').should('exist');
    cy.get('#qsv_preset').click();
    cy.get('[role="option"]').should('have.length', 7);
    cy.contains('[role="option"]', 'slowest').click();
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.equal', { ...BASE_BODY, qsv_preset: 'slowest' });

    openTab('amd_usage', 'amd', 'windows');
    for (const id of [
      'amd_usage',
      'amd_rc',
      'amd_enforce_hrd',
      'amd_quality',
      'amd_preanalysis',
      'amd_vbaq',
      'amd_coder',
    ]) {
      cy.get(`#${id}`).should('exist');
    }
  });

  it('PyroWave shows the note and saves numbers as numbers', () => {
    openTab('pyrowave_packet_size', 'pyrowave', 'windows');
    cy.get('[data-testid="pyrowave-note"]').should('contain.text', 'Experimental');
    cy.get('#pyrowave_simulated_loss').should('have.attr', 'step', '0.5');
    cy.get('#pyrowave_min_frame_kb').clear();
    cy.get('#pyrowave_min_frame_kb').type('32');
    cy.get('#pyrowave_simulated_loss').clear();
    cy.get('#pyrowave_simulated_loss').type('1.5');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.equal', { ...BASE_BODY, pyrowave_min_frame_kb: 32, pyrowave_simulated_loss: 1.5 });
  });

  it('VideoToolbox renders on macOS', () => {
    openTab('vt_coder', 'vt', 'macos');
    for (const id of ['vt_coder', 'vt_software', 'vt_realtime']) {
      cy.get(`#${id}`).should('exist');
    }
  });

  it('VA-API renders on Linux', () => {
    openTab('vaapi_strict_rc_buffer', 'vaapi', 'linux');
    cy.get('#vaapi_strict_rc_buffer').should('exist');
  });

  it('Software lists the nine presets', () => {
    openTab('sw_preset', 'sw', 'windows');
    cy.get('#sw_preset').click();
    cy.get('[role="option"]').should('have.length', 9);
    cy.get('body').type('{esc}');
    cy.get('#sw_tune').should('exist');
  });

  it('shows the pt_BR texts', () => {
    openTab('nvenc_preset', 'nv', 'windows', 'pt_BR');
    cy.get('[data-testid="config-panel-nv"]').should('be.visible');
    cy.contains('[data-testid="config-panel-nv"]', 'Predefini').should('be.visible');
  });
});
