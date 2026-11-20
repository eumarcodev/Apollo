import { stubServerApi, type StubLocale, type StubPlatform } from '../../support/api';

const HOST = { host_name: 'Test PC', host_uuid: 'HOST-UUID-1' };

const EXISTING = {
  uuid: 'uuid-alpha',
  name: 'Alpha',
  cmd: 'alpha.exe',
  'exclude-global-prep-cmd': true,
  'prep-cmd': [{ do: 'before.bat', undo: 'after.bat', elevated: true }],
  detached: ['tool.exe'],
  'exit-timeout': 9,
  'scale-factor': 120,
  'use-app-identity': true,
  'per-client-app-identity': true,
  gamepad: 'auto',
};

const TEMPLATE = {
  name: 'New App',
  output: '',
  cmd: '',
  'exclude-global-prep-cmd': false,
  'exclude-global-state-cmd': false,
  elevated: false,
  'auto-detach': true,
  'wait-all': true,
  'exit-timeout': 5,
  'prep-cmd': [],
  'state-cmd': [],
  detached: [],
  'image-path': '',
  'scale-factor': 100,
  'use-app-identity': false,
  'per-client-app-identity': false,
  'allow-client-commands': true,
  'virtual-display': false,
  'terminate-on-pause': false,
  gamepad: '',
};

interface VisitOptions {
  platform?: StubPlatform;
  locale?: StubLocale;
}

function visitApps({ platform = 'windows', locale = 'en' }: VisitOptions = {}) {
  stubServerApi({
    platform,
    locale,
    overrides: {
      'GET /api/apps': { statusCode: 200, body: { apps: [EXISTING], current_app: '', ...HOST } },
    },
  });
  cy.visit('/apps');
  cy.wait('@config');
  cy.get('[data-testid="apps-table"]').should('be.visible');
}

function stubSave(response: Record<string, unknown> = { status: true }, status = 200) {
  cy.intercept({ method: 'POST', pathname: '/api/apps' }, { statusCode: status, body: response }).as('save');
}

function openNew() {
  cy.get('[data-testid="add-app"]').click();
  cy.get('[data-testid="app-editor"]').should('be.visible');
}

describe('apps editor: fields per platform', () => {
  it('shows every field of the template on Windows', () => {
    visitApps();
    openNew();
    cy.get('h1').should('have.text', 'New App');
    cy.get('[data-testid="appName"]').should('have.value', 'New App');
    cy.get('[data-testid="cover-finder-slot"]').should('exist');
    cy.get('[data-testid="gamepad-trigger"]').should('contain.text', 'Default (Global)').click();
    cy.get('[role="option"]').then(($options) => {
      expect([...$options].map((el) => el.textContent?.trim())).to.deep.equal([
        'Default (Global)',
        'Disabled',
        'Automatic',
        'DS4 (PS4)',
        'X360 (Xbox 360)',
      ]);
    });
    cy.get('body').type('{esc}');
    cy.get('#appElevation').should('exist');
    cy.get('[data-testid="excludeGlobal_prep-default"]').should('have.text', 'Default: checked');
    cy.get('[data-testid="exitTimeout"]').should('have.value', '5').and('have.attr', 'placeholder', '5');
    cy.get('[data-testid="scale-factor-label"]').should('have.text', 'Resolution Scale Factor: 100%');
    cy.get('[data-testid="env-vars-table"] tbody tr').should('have.length', 14);
    cy.get('[data-testid="env-example"]').should('contain.text', 'Example - rtss-cli for FPS Limitation:');
    cy.get('[data-testid="env-see-more"]')
      .should('have.attr', 'href', 'https://github.com/eumarcodev/Helios-Server/blob/master/docs/app_examples.md')
      .and('have.attr', 'target', '_blank');
    cy.get('[data-testid="env_sunshine_compatibility"]').should('be.visible');
    cy.get('[data-testid="env_legacy_alias_compatibility"]').should('be.visible');
  });

  it('offers the Linux gamepads and hides the Windows-only fields', () => {
    visitApps({ platform: 'linux' });
    openNew();
    cy.get('[data-testid="gamepad-trigger"]').click();
    cy.get('[role="option"]').should('have.length', 6).last().should('have.text', 'XOne (Xbox One)');
    cy.get('body').type('{esc}');
    cy.get('#appElevation').should('not.exist');
    cy.get('[data-testid="scale-factor"]').should('not.exist');
    cy.get('[data-testid="env-example"]').should('contain.text', 'xrandr --output HDMI-1');
  });

  it('has no gamepad override on macOS', () => {
    visitApps({ platform: 'macos' });
    openNew();
    cy.get('[data-testid="gamepad-trigger"]').should('not.exist');
    cy.get('[data-testid="env-example"]').should('contain.text', 'displayplacer');
  });

  it('is translated to Portuguese', () => {
    visitApps({ locale: 'pt_BR' });
    openNew();
    cy.get('[data-testid="editor-general"] h2').should('have.text', 'Geral');
    cy.get('[data-testid="editor-save"]').should('contain.text', 'Salvar');
    cy.get('[data-testid="env-see-more"]').should('contain.text', 'Ver Mais');
  });
});

describe('apps editor: save', () => {
  it('posts the template for a new app, then closes the editor and reloads the list', () => {
    visitApps();
    openNew();
    stubSave();
    cy.intercept({ method: 'GET', pathname: '/api/apps' }).as('reload');
    cy.get('[data-testid="editor-save"]').click();
    cy.wait('@save').its('request.body').should('deep.equal', TEMPLATE);
    cy.wait('@reload');
    cy.get('[data-testid="apps-table"]').should('be.visible');
  });

  it('normalises the form like the legacy editor', () => {
    visitApps();
    openNew();
    stubSave();
    cy.get('[data-testid="appName"]').clear().type('  Game  ');
    cy.get('h1').should('have.text', '  Game  ');
    cy.get('[data-testid="appImagePath"]').type('  "C:\\covers\\game.png"  ');
    cy.get('[data-testid="appCmd"]').type('"C:\\Games\\game.exe"');
    cy.get('[data-testid="exitTimeout"]').clear().blur();
    cy.get('[data-testid="detached-add"]').click();
    cy.get('[data-testid="detached-row-0"] input').type('helper.exe');
    cy.get('[data-testid="prep-cmd-add"]').click();
    cy.get('[data-testid="prep-cmd-row-0"] input').first().type('before.bat');
    // Inverse values: switching "use global commands" off sets exclude-global-state-cmd to true.
    cy.get('#excludeGlobal_state').should('be.checked').click({ force: true });
    cy.get('#excludeGlobal_state').should('not.be.checked');
    cy.get('[data-testid="editor-save-bottom"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.equal', {
        ...TEMPLATE,
        name: 'Game',
        'image-path': 'C:\\covers\\game.png',
        cmd: '"C:\\Games\\game.exe"',
        'exit-timeout': 5,
        detached: ['helper.exe'],
        'prep-cmd': [{ do: 'before.bat', undo: '', elevated: false }],
        'exclude-global-state-cmd': true,
      });
  });

  it('keeps every saved value of an existing app and its uuid', () => {
    visitApps();
    stubSave();
    cy.get('[data-testid="app-edit-uuid-alpha"]').click();
    cy.get('h1').should('have.text', 'Alpha');
    cy.get('[data-testid="gamepad-trigger"]').should('contain.text', 'Automatic');
    cy.get('#excludeGlobal_prep').should('not.be.checked');
    cy.get('#perClientAppIdentity').should('exist');
    cy.get('[data-testid="scale-factor-label"]').should('have.text', 'Resolution Scale Factor: 120%');
    cy.get('[data-testid="detached-row-0"] input').should('have.value', 'tool.exe');
    cy.get('[data-testid="editor-save"]').click();
    cy.wait('@save')
      .its('request.body')
      .should('deep.equal', { ...TEMPLATE, ...EXISTING });
  });

  it('disables save for a blank name and shows the placeholder title', () => {
    visitApps();
    openNew();
    cy.get('[data-testid="appName"]').clear().type('   ');
    cy.get('[data-testid="editor-save"]').should('be.disabled');
    cy.get('[data-testid="editor-save-bottom"]').should('be.disabled');
    cy.get('[data-testid="appName"]').clear();
    cy.get('h1').should('have.text', '< NO NAME >');
  });

  it('shows the host error and keeps the editor open when the save fails', () => {
    visitApps();
    openNew();
    stubSave({ status: false, error: 'apps.json is read-only' }, 400);
    cy.get('[data-testid="editor-save"]').click();
    cy.wait('@save');
    cy.contains('Failed to save app: apps.json is read-only').should('be.visible');
    cy.get('[data-testid="app-editor"]').should('be.visible');
  });

  it('disables save while the request runs', () => {
    visitApps();
    openNew();
    cy.intercept({ method: 'POST', pathname: '/api/apps' }, { delay: 800, statusCode: 200, body: { status: true } }).as(
      'slowSave',
    );
    cy.get('[data-testid="editor-save"]').click();
    cy.get('[data-testid="editor-save"]').should('be.disabled');
    cy.wait('@slowSave');
    cy.get('[data-testid="apps-table"]').should('be.visible');
  });
});
