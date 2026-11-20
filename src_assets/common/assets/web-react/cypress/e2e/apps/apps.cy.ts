import { stubServerApi, type StubLocale } from '../../support/api';

interface TestApp {
  uuid: string;
  name: string;
}

const APPS: TestApp[] = [
  { uuid: 'uuid-cyber', name: 'Cyberpunk' },
  { uuid: 'uuid-alpha', name: 'Alpha' },
  { uuid: 'uuid-beta', name: 'Beta' },
];

const HOST = { host_name: 'Test PC', host_uuid: 'HOST-UUID-1' };

interface VisitOptions {
  apps?: TestApp[];
  currentApp?: string;
  locale?: StubLocale;
}

/** Visit /apps with a synthetic listing; the actions are stubbed and aliased by the caller when needed. */
function visitApps({ apps = APPS, currentApp = '', locale = 'en' }: VisitOptions = {}) {
  stubServerApi({
    locale,
    overrides: {
      'GET /api/apps': { statusCode: 200, body: { apps, current_app: currentApp, ...HOST } },
    },
  });
  cy.visit('/apps');
  cy.get('[data-testid="apps-table"]').should('be.visible');
}

function names() {
  return cy.get('[data-testid^="app-name-"]').then(($names) => [...$names].map((el) => el.textContent));
}

function stubAction(path: string, alias: string, response: Record<string, unknown> = { status: true }, status = 200) {
  cy.intercept({ method: 'POST', pathname: path }, { statusCode: status, body: response }).as(alias);
}

describe('apps: list', () => {
  it('shows the texts, the apps in the saved order and the actions of each row', () => {
    visitApps({ currentApp: 'uuid-beta' });
    cy.get('h1').should('have.text', 'Applications');
    cy.contains('Applications are refreshed when a session is terminated.').should('be.visible');
    cy.contains('Drag and drop apps to reorder the apps.').should('be.visible');
    cy.get('[data-testid="apps-tips"]')
      .should('contain.text', 'Tip: You can also right click the launch app button')
      .and('have.css', 'white-space', 'pre-wrap');
    cy.get('[data-testid="apps-table"] th').then(($th) => {
      expect([...$th].map((el) => el.textContent?.trim())).to.deep.equal(['', 'Name', 'Actions']);
    });
    names().should('deep.equal', ['Cyberpunk', 'Alpha', 'Beta']);
    // Only the running app gets the close button; the others get the launch link.
    cy.get('[data-testid="app-close-uuid-beta"]').should('be.visible');
    cy.get('[data-testid="app-launch-uuid-beta"]').should('not.exist');
    cy.get('[data-testid="app-close-uuid-alpha"]').should('not.exist');
    cy.get('[data-testid="app-launch-uuid-alpha"]')
      .should(
        'have.attr',
        'href',
        'art://launch?host_uuid=HOST-UUID-1&host_name=Test PC&app_uuid=uuid-alpha&app_name=Alpha',
      )
      .and('be.visible');
    cy.get('[data-testid="app-edit-uuid-alpha"]').should('be.visible');
    cy.get('[data-testid="app-delete-uuid-alpha"]').should('be.visible');
    cy.get('[data-testid="add-app"]').should('contain.text', 'Add New');
    cy.get('[data-testid="alphabetize-apps"]').should('contain.text', 'Alphabetize');
  });

  it('keeps only the apps that have a uuid', () => {
    stubServerApi({
      overrides: {
        'GET /api/apps': {
          statusCode: 200,
          body: { apps: [{ name: 'No uuid' }, ...APPS], current_app: '', ...HOST },
        },
      },
    });
    cy.visit('/apps');
    names().should('deep.equal', ['Cyberpunk', 'Alpha', 'Beta']);
  });

  it('shows an empty state', () => {
    visitApps({ apps: [] });
    cy.get('[data-testid="apps-empty"]').should('have.text', 'No applications yet.');
  });

  it('is translated to Portuguese', () => {
    visitApps({ locale: 'pt_BR' });
    cy.get('h1').should('have.text', 'Aplicativos');
    cy.get('[data-testid="add-app"]').should('contain.text', 'Adicionar Novo');
    cy.get('[data-testid="alphabetize-apps"]').should('contain.text', 'Ordem alfabética');
    cy.get('[data-testid="apps-table"] th').eq(1).should('have.text', 'Nome');
  });

  it('shows the error when the list cannot be loaded', () => {
    stubServerApi({
      overrides: { 'GET /api/apps': { statusCode: 400, body: { status: false, error: 'apps.json is broken' } } },
    });
    cy.visit('/apps');
    cy.get('[data-testid="apps-error"]').should('contain.text', 'Could not load the applications: apps.json is broken');
  });
});

describe('apps: order', () => {
  it('alphabetizes as a preview, then saves the order and reloads the list', () => {
    visitApps();
    stubAction('/api/apps/reorder', 'reorder');
    cy.get('[data-testid="alphabetize-apps"]').click();
    names().should('deep.equal', ['Alpha', 'Beta', 'Cyberpunk']);
    cy.get('[data-testid="alphabetize-apps"]').should('not.exist');
    cy.get('@reorder.all').should('have.length', 0);
    cy.intercept(
      { method: 'GET', pathname: '/api/apps' },
      { statusCode: 200, body: { apps: [APPS[1], APPS[2], APPS[0]], current_app: '', ...HOST } },
    ).as('reload');
    cy.get('[data-testid="save-order"]').should('contain.text', 'Save Order').click();
    cy.wait('@reorder')
      .its('request.body')
      .should('deep.equal', {
        order: ['uuid-alpha', 'uuid-beta', 'uuid-cyber'],
      });
    cy.wait('@reload');
    cy.get('[data-testid="alphabetize-apps"]').should('be.visible');
    cy.get('[data-testid="save-order"]').should('not.exist');
  });

  it('says so when the list is already alphabetical and keeps the Alphabetize button', () => {
    visitApps({ apps: [APPS[1], APPS[2], APPS[0]] as TestApp[] });
    cy.get('[data-testid="alphabetize-apps"]').click();
    cy.contains('Apps are already alphabetized.').should('be.visible');
    cy.get('[data-testid="save-order"]').should('not.exist');
  });

  it('reorders by keyboard through the grip button and shows Save Order', () => {
    visitApps();
    cy.get('[data-testid="app-row-uuid-beta"] button[slot="drag"]').focus().type('{enter}', { force: true });
    cy.get('.helios-drop-indicator[data-drop-target]').should('exist');
    cy.focused().type('{uparrow}{uparrow}{uparrow}{enter}', { force: true });
    names().should('deep.equal', ['Beta', 'Cyberpunk', 'Alpha']);
    stubAction('/api/apps/reorder', 'reorder');
    cy.get('[data-testid="save-order"]').click();
    cy.wait('@reorder')
      .its('request.body')
      .should('deep.equal', {
        order: ['uuid-beta', 'uuid-cyber', 'uuid-alpha'],
      });
  });

  it('shows the host error when saving fails and reloads the saved order', () => {
    visitApps();
    stubAction('/api/apps/reorder', 'reorder', { status: false, error: 'file is read-only' }, 400);
    cy.get('[data-testid="alphabetize-apps"]').click();
    cy.get('[data-testid="save-order"]').click();
    cy.contains('Failed to reorder apps: file is read-only').should('be.visible');
    names().should('deep.equal', ['Cyberpunk', 'Alpha', 'Beta']);
    cy.get('[data-testid="alphabetize-apps"]').should('be.visible');
  });

  it('disables every action while the request runs', () => {
    visitApps();
    cy.intercept(
      { method: 'POST', pathname: '/api/apps/reorder' },
      { delay: 800, statusCode: 200, body: { status: true } },
    ).as('slowReorder');
    cy.get('[data-testid="alphabetize-apps"]').click();
    cy.get('[data-testid="save-order"]').click();
    cy.get('[data-testid="save-order"]').should('be.disabled');
    cy.get('[data-testid="add-app"]').should('be.disabled');
    cy.get('[data-testid="app-edit-uuid-alpha"]').should('be.disabled');
    cy.get('[data-testid="app-delete-uuid-alpha"]').should('be.disabled');
    cy.get('[data-testid="app-launch-uuid-alpha"]').should('have.attr', 'aria-disabled', 'true');
    cy.wait('@slowReorder');
    cy.get('[data-testid="add-app"]').should('be.enabled');
  });
});

describe('apps: launch, close and delete', () => {
  it('launches after confirming and reloads the list', () => {
    visitApps();
    stubAction('/api/apps/launch', 'launch');
    cy.get('[data-testid="app-launch-uuid-alpha"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('contain.text', 'Are you sure you want to launch this app?');
    cy.get('[data-testid="confirm-accept"]').click();
    cy.wait('@launch').its('request.body').should('deep.equal', { uuid: 'uuid-alpha' });
    cy.get('[data-testid="confirm-dialog"]').should('not.exist');
  });

  it('does not launch when the confirmation is cancelled', () => {
    visitApps();
    stubAction('/api/apps/launch', 'launch');
    cy.get('[data-testid="app-launch-uuid-alpha"]').click();
    cy.get('[data-testid="confirm-cancel"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('not.exist');
    cy.get('@launch.all').should('have.length', 0);
  });

  it('shows the host error when the launch fails', () => {
    visitApps();
    stubAction('/api/apps/launch', 'launch', { status: false, error: 'No display is connected' }, 400);
    cy.get('[data-testid="app-launch-uuid-alpha"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.contains('App launch failed: No display is connected').should('be.visible');
  });

  it('closes the running app after confirming', () => {
    visitApps({ currentApp: 'uuid-beta' });
    stubAction('/api/apps/close', 'close');
    cy.get('[data-testid="app-close-uuid-beta"]').click();
    cy.get('[data-testid="confirm-dialog"]').should(
      'contain.text',
      'Are you sure to terminate the current running app?',
    );
    cy.get('[data-testid="confirm-accept"]').click();
    cy.wait('@close');
  });

  it('shows a translated message when the close fails', () => {
    visitApps({ currentApp: 'uuid-beta' });
    stubAction('/api/apps/close', 'close', { status: false }, 200);
    cy.get('[data-testid="app-close-uuid-beta"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.contains('App termination failed.').should('be.visible');
    cy.contains('apps.close_failed').should('not.exist');
  });

  it('asks with the app name and deletes by uuid', () => {
    visitApps();
    stubAction('/api/apps/delete', 'delete');
    cy.get('[data-testid="app-delete-uuid-cyber"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('contain.text', 'Are you sure you want to delete Cyberpunk?');
    cy.get('[data-testid="confirm-accept"]').click();
    cy.wait('@delete').its('request.body').should('deep.equal', { uuid: 'uuid-cyber' });
  });

  it('shows the host error when the delete fails and does not delete when cancelled', () => {
    visitApps();
    stubAction('/api/apps/delete', 'delete', { status: false, error: 'apps.json is locked' }, 400);
    cy.get('[data-testid="app-delete-uuid-cyber"]').click();
    cy.get('[data-testid="confirm-cancel"]').click();
    cy.get('@delete.all').should('have.length', 0);
    cy.get('[data-testid="app-delete-uuid-cyber"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.contains('App delete failed: apps.json is locked').should('be.visible');
  });
});

describe('apps: export and editor', () => {
  const EXPECTED = (app: TestApp) =>
    [
      '# Selene app entry',
      '# Exported by Helios',
      '# https://github.com/eumarcodev/Helios-Server',
      '',
      `[host_uuid] ${HOST.host_uuid}`,
      `[host_name] ${HOST.host_name}`,
      `[app_uuid] ${app.uuid}`,
      `[app_name] ${app.name}`,
      '',
    ].join('\n');

  it('downloads <name>.art with the launcher content on a double click of the name', () => {
    visitApps();
    cy.get('[data-testid="app-name-uuid-alpha"]').dblclick();
    cy.readFile('cypress/downloads/Alpha.art', 'utf8', { timeout: 10000 }).should('eq', EXPECTED(APPS[1] as TestApp));
  });

  it('opens the editor for a new app (export disabled) and returns with Cancel', () => {
    visitApps();
    cy.get('[data-testid="add-app"]').click();
    cy.get('h1').should('have.text', 'New App');
    cy.get('[data-testid="editor-export"]').should('be.disabled');
    cy.get('[data-testid="editor-pending"]').should('be.visible');
    cy.get('[data-testid="editor-cancel"]').click();
    cy.get('[data-testid="apps-table"]').should('be.visible');
  });

  it('opens the editor for an existing app and exports it from there', () => {
    visitApps();
    cy.get('[data-testid="app-edit-uuid-beta"]').click();
    cy.get('h1').should('have.text', 'Beta');
    cy.get('[data-testid="editor-export"]').should('be.enabled').click();
    cy.readFile('cypress/downloads/Beta.art', 'utf8', { timeout: 10000 }).should('eq', EXPECTED(APPS[2] as TestApp));
  });
});
