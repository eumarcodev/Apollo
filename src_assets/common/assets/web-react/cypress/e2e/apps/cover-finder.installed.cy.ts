import { stubGameDb } from '../../support/covers';
import { loginInstalled } from '../../support/installed';

interface HostApp {
  uuid?: string;
  name: string;
  'image-path'?: string;
}

const APP_NAME = `cypress-e2e-cover-${Date.now()}`;
// The host stores the cover as <covers dir>/<key>.png: a fixed key keeps a single leftover file between runs.
const COVER_KEY = 'cypress-e2e-cover';
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function hostApps(): Cypress.Chainable<HostApp[]> {
  return cy.request<{ apps: HostApp[] }>('/api/apps').its('body.apps');
}

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

// GameDB and IGDB are stubbed in the browser. The host would download the cover from images.igdb.com itself, which a
// browser stub cannot intercept, so the upload request is rewritten to the host's inline-data form with a fixed
// cypress-e2e key: the real endpoint still stores a real file and answers its path. Only a temporary cypress-e2e app
// receives the cover and it is deleted in after().
describe('installed apps cover finder: pick a cover for an own app', () => {
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

  it('finds the stubbed covers, stores the picked one on the host and saves it on the app', () => {
    stubGameDb();
    cy.intercept({ method: 'POST', pathname: '/api/covers/upload' }, (req) => {
      expect(req.body).to.deep.equal({
        key: 'igdb_1',
        url: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1doom.png',
      });
      req.body = { key: COVER_KEY, data: PNG_1X1 };
      req.continue();
    }).as('upload');
    cy.visit('/apps');
    cy.get('[data-testid="add-app"]').click();
    cy.get('[data-testid="appName"]').clear().type('Doom');
    cy.get('[data-testid="cover-finder-open"]').click();
    cy.get('[data-testid="cover-finder-results"] li').should('have.length', 2);
    cy.get('[data-testid="cover-igdb_1"]').click();
    cy.wait('@upload').its('response.statusCode').should('eq', 200);
    cy.get('[data-testid="cover-finder-dialog"]').should('not.exist');
    cy.get('[data-testid="appImagePath"]')
      .invoke('val')
      .should('match', /cypress-e2e-cover\.png$/);
    cy.get('[data-testid="appName"]').clear().type(APP_NAME);
    cy.get('[data-testid="appCmd"]').type('cmd /c exit 0');
    cy.intercept({ method: 'POST', pathname: '/api/apps' }).as('save');
    cy.get('[data-testid="editor-save"]').click();
    cy.wait('@save').its('response.statusCode').should('eq', 200);
    hostApps().then((apps) => {
      const created = apps.find((app) => app.name === APP_NAME);
      expect(created?.['image-path']).to.match(/cypress-e2e-cover\.png$/);
    });
  });
});
