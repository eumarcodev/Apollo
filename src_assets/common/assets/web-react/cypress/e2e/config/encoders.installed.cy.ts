import { loginInstalled, restoreConfig, snapshotConfig, type ConfigSnapshot } from '../../support/installed';

// Changes pyrowave_min_frame_kb only, saves (never Apply: no restart) and writes the snapshot back afterwards.
// Windows host: it never touches `pyrowave`, presets or rate control.
describe('installed config: encoder tabs', () => {
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

  it('renders the NVENC fields', () => {
    cy.visit('/config#nvenc_preset');
    cy.get('[data-testid="config-tab-nv"]').should('have.attr', 'aria-selected', 'true');
    for (const id of [
      'nvenc_preset',
      'nvenc_twopass',
      'nvenc_vbv_increase',
      'nvenc_h264_cavlc',
      'nvenc_intra_refresh',
    ]) {
      cy.get(`[id="${id}"]`).should('have.length', 1);
    }
  });

  it('saves a changed PyroWave minimum frame size and the host reports it', () => {
    cy.intercept({ method: 'POST', pathname: '/api/config' }).as('save');
    cy.visit('/config#pyrowave_min_frame_kb');
    cy.get('[data-testid="config-tab-pyrowave"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#pyrowave_min_frame_kb').clear();
    cy.get('#pyrowave_min_frame_kb').type('33');
    cy.get('[data-testid="config-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.request<Record<string, unknown>>('/api/config')
      .its('body.pyrowave_min_frame_kb')
      .should('satisfy', (value: unknown) => Number(value) === 33);
  });
});
