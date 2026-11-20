import { loginInstalled } from '../../support/installed';

interface HostApp {
  uuid?: string;
  name: string;
}

interface HostApps {
  apps: HostApp[];
  host_name: string;
  host_uuid: string;
}

// Read-only: lists the apps, previews the alphabetical order without saving it and exports a launcher file.
// It never saves the order, launches, closes or deletes an app on the installed host.
describe('installed apps: the list of the installed host', () => {
  beforeEach(() => {
    loginInstalled();
  });

  it('lists the apps that GET /api/apps returns (only those with a uuid)', () => {
    cy.request<HostApps>('/api/apps')
      .its('body')
      .then((body) => {
        const expected = body.apps.filter((app) => app.uuid).map((app) => app.name);
        cy.visit('/apps');
        cy.get('[data-testid="apps-panel"]').should('be.visible');
        if (expected.length === 0) {
          cy.get('[data-testid="apps-empty"]').should('be.visible');
          return;
        }
        cy.get('[data-testid^="app-name-"]').should(($names) => {
          expect([...$names].map((el) => el.textContent)).to.deep.equal(expected);
        });
      });
  });

  it('previews the alphabetical order without saving it', () => {
    cy.request<HostApps>('/api/apps')
      .its('body')
      .then((body) => {
        const before = body.apps.filter((app) => app.uuid).map((app) => app.name);
        const sorted = [...before].sort((a, b) => a.localeCompare(b));
        cy.visit('/apps');
        cy.get('[data-testid="alphabetize-apps"]').click();
        if (before.join('\n') === sorted.join('\n')) {
          cy.get('[data-testid="save-order"]').should('not.exist');
        } else {
          cy.get('[data-testid="save-order"]').should('be.visible');
          cy.get('[data-testid^="app-name-"]').should(($names) => {
            expect([...$names].map((el) => el.textContent)).to.deep.equal(sorted);
          });
        }
        // Reload: nothing was saved, so the host order comes back.
        cy.reload();
        cy.get('[data-testid^="app-name-"]').should(($names) => {
          expect([...$names].map((el) => el.textContent)).to.deep.equal(before);
        });
        cy.request<HostApps>('/api/apps')
          .its('body.apps')
          .then((apps: HostApp[]) => {
            expect(apps.filter((app) => app.uuid).map((app) => app.name)).to.deep.equal(before);
          });
      });
  });

  it('exports the launcher file of the first app', () => {
    cy.request<HostApps>('/api/apps')
      .its('body')
      .then((body) => {
        const app = body.apps.find((entry) => entry.uuid);
        if (!app?.uuid) {
          return;
        }
        cy.visit('/apps');
        cy.get(`[data-testid="app-name-${app.uuid}"]`).dblclick();
        const content = [
          '# Selene app entry',
          '# Exported by Helios',
          '# https://github.com/eumarcodev/Helios-Server',
          '',
          `[host_uuid] ${body.host_uuid}`,
          `[host_name] ${body.host_name}`,
          `[app_uuid] ${app.uuid}`,
          `[app_name] ${app.name}`,
          '',
        ].join('\n');
        cy.readFile(`cypress/downloads/${app.name}.art`, 'utf8', { timeout: 10000 }).should('eq', content);
      });
  });
});
