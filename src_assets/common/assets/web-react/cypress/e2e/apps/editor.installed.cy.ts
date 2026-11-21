import { loginInstalled } from '../../support/installed';

interface HostApp {
  uuid?: string;
  name: string;
  [field: string]: unknown;
}

const APP_NAME = `cypress-e2e-${Date.now()}`;
const EDITED_NAME = `${APP_NAME}-edited`;

function hostApps(): Cypress.Chainable<HostApp[]> {
  return cy.request<{ apps: HostApp[] }>('/api/apps').its('body.apps');
}

/** Delete every app this spec created (by name), leaving the rest of the host list untouched. */
function deleteOwnApps() {
  hostApps().then((apps) => {
    for (const app of apps.filter((entry) => entry.uuid && entry.name.startsWith(APP_NAME))) {
      cy.request({
        method: 'POST',
        url: '/api/apps/delete',
        headers: { 'Content-Type': 'application/json' },
        body: { uuid: app.uuid },
      });
    }
  });
}

// Creates one app named cypress-e2e-<timestamp>, edits it and deletes it in after(); it never launches or closes an
// app and never touches the other apps of the installed host.
describe('installed apps editor: create, edit and remove an own app', () => {
  let initialUuids: string[] = [];

  before(() => {
    loginInstalled();
    hostApps().then((apps) => {
      initialUuids = apps.filter((app) => app.uuid).map((app) => app.uuid as string);
    });
  });

  beforeEach(() => {
    loginInstalled();
  });

  after(() => {
    loginInstalled();
    deleteOwnApps();
    hostApps().then((apps) => {
      expect(apps.filter((app) => app.uuid).map((app) => app.uuid)).to.deep.equal(initialUuids);
    });
  });

  it('creates an app with the editor', () => {
    cy.visit('/apps');
    cy.get('[data-testid="add-app"]').click();
    cy.get('[data-testid="appName"]').clear().type(APP_NAME);
    cy.get('[data-testid="appCmd"]').type('cmd /c exit 0');
    cy.get('[data-testid="detached-add"]').click();
    cy.get('[data-testid="detached-row-0"] input').type('cmd /c echo helios');
    cy.intercept({ method: 'POST', pathname: '/api/apps' }).as('save');
    cy.get('[data-testid="editor-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    cy.get('[data-testid="apps-table"]').should('contain.text', APP_NAME);
    hostApps().then((apps) => {
      const created = apps.find((app) => app.name === APP_NAME);
      expect(created?.uuid, 'created app uuid').to.be.a('string').and.have.length.greaterThan(0);
      expect(created?.cmd).to.eq('cmd /c exit 0');
      expect(created?.detached).to.deep.equal(['cmd /c echo helios']);
    });
  });

  it('edits the app and the host returns the new values', () => {
    hostApps().then((apps) => {
      const created = apps.find((app) => app.name === APP_NAME);
      expect(created?.uuid, 'created app').to.be.a('string');
      cy.visit('/apps');
      cy.get(`[data-testid="app-edit-${created?.uuid}"]`).click();
      cy.get('[data-testid="appCmd"]').should('have.value', 'cmd /c exit 0');
      cy.get('[data-testid="appName"]').clear().type(EDITED_NAME);
      cy.get('[data-testid="appWorkingDir"]').type('cypress-working-dir');
      cy.get('#excludeGlobal_prep').should('be.checked').click({ force: true });
      cy.get('[data-testid="editor-save-bottom"]').click();
      cy.get('[data-testid="apps-table"]').should('contain.text', EDITED_NAME);
      hostApps().then((updated) => {
        const edited = updated.find((app) => app.uuid === created?.uuid);
        expect(edited?.name).to.eq(EDITED_NAME);
        expect(edited?.['working-dir']).to.eq('cypress-working-dir');
        expect(edited?.['exclude-global-prep-cmd']).to.eq(true);
        expect(updated.filter((app) => app.name.startsWith(APP_NAME))).to.have.length(1);
      });
    });
  });
});
