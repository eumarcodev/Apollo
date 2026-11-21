import { stubServerApi, type StubLocale, type StubPlatform } from '../../support/api';

interface Cert {
  name: string;
  uuid: string;
  display_mode: string;
  perm: string;
  connected: boolean;
  do?: Array<{ cmd: string; elevated: boolean }>;
  undo?: Array<{ cmd: string; elevated: boolean }>;
  allow_client_commands: boolean;
  enable_legacy_ordering: boolean;
  always_use_virtual_display: boolean;
}

const TABLET: Cert = {
  name: 'Tablet',
  uuid: 'tablet-uuid',
  display_mode: '',
  perm: '50331648',
  connected: true,
  do: [{ cmd: 'echo up', elevated: false }],
  allow_client_commands: true,
  enable_legacy_ordering: true,
  always_use_virtual_display: false,
};

const PHONE: Cert = {
  ...TABLET,
  name: '',
  uuid: 'phone-uuid',
  perm: '117440512',
  connected: false,
  do: [],
};

interface VisitOptions {
  clients?: Cert[];
  platform?: StubPlatform;
  locale?: StubLocale;
  update?: Record<string, unknown>;
  unpairAll?: Record<string, unknown>;
}

/** Stubs the pairing and the device endpoints; unpair removes the device from the list the stub serves. */
function visitPin({
  clients = [TABLET, PHONE],
  platform = 'windows',
  locale = 'en',
  update = { status: true },
  unpairAll = { status: true },
}: VisitOptions = {}) {
  let current = [...clients];
  stubServerApi({ platform, locale });
  cy.intercept({ method: 'GET', pathname: '/api/clients/list' }, (request) => {
    request.reply({ status: true, platform, named_certs: current });
  }).as('list');
  cy.intercept({ method: 'POST', pathname: '/api/clients/update' }, { statusCode: 200, body: update }).as('update');
  cy.intercept({ method: 'POST', pathname: '/api/clients/disconnect' }, { statusCode: 200, body: { status: true } }).as(
    'disconnect',
  );
  cy.intercept({ method: 'POST', pathname: '/api/clients/unpair' }, (request) => {
    const { uuid } = request.body as { uuid: string };
    current = current.filter((cert) => cert.uuid !== uuid);
    request.reply({ status: true });
  }).as('unpair');
  cy.intercept({ method: 'POST', pathname: '/api/clients/unpair-all' }, (request) => {
    if ((unpairAll as { status: boolean }).status) {
      current = [];
    }
    request.reply(unpairAll);
  }).as('unpairAll');
  cy.visit('/pin');
  cy.wait('@list');
}

function row(uuid: string) {
  return cy.get(`[data-testid="client-${uuid}"]`);
}

function edit(uuid: string) {
  row(uuid).find('[data-testid="client-edit"]').click();
  cy.get('[data-testid="client-editor"]').should('be.visible');
}

describe('clients: list', () => {
  it('shows each device with its permission badge, name and actions', () => {
    visitPin();
    cy.get('h1').should('have.text', 'PIN');
    cy.get('[data-testid="clients-card"] h2').should('have.text', 'Device Management');
    row('tablet-uuid').within(() => {
      cy.get('[data-testid="client-perm"]')
        .should('have.text', '[ 03 00 00 ]')
        .and('have.attr', 'data-danger', 'false');
      cy.get('[data-testid="client-name"]').should('have.text', 'Tablet');
      cy.get('[data-testid="client-connected"]').should('be.visible');
      cy.get('[data-testid="client-disconnect"]').should('be.visible');
      cy.get('[data-testid="client-edit"]').should('be.visible');
      cy.get('[data-testid="client-unpair"]').should('be.visible');
    });
    row('phone-uuid').within(() => {
      cy.get('[data-testid="client-perm"]').should('have.text', '[ 07 00 00 ]').and('have.attr', 'data-danger', 'true');
      cy.get('[data-testid="client-name"]').should('have.text', 'Unknown Client');
      cy.get('[data-testid="client-disconnect"]').should('not.exist');
    });
    cy.get('[data-testid="permissions-docs"]')
      .should('have.attr', 'href', 'https://github.com/eumarcodev/Helios-Server/tree/master/docs')
      .and('have.attr', 'target', '_blank');
  });

  it('shows the empty state when there are no devices', () => {
    visitPin({ clients: [] });
    cy.get('[data-testid="clients-empty"]').should('have.text', 'There are no paired devices.');
  });

  it('reloads the page when the list cannot be read', () => {
    stubServerApi();
    cy.intercept(
      { method: 'GET', pathname: '/api/clients/list' },
      { statusCode: 200, body: { status: true, named_certs: [TABLET] } },
    ).as('list');
    // Registered last, so it answers first; it is used once and the reloaded page gets the answer above.
    cy.intercept({ method: 'GET', pathname: '/api/clients/list', times: 1 }, { forceNetworkError: true }).as('broken');
    cy.visit('/pin');
    cy.wait('@broken');
    cy.wait('@list');
    row('tablet-uuid').should('be.visible');
  });

  it('renders in Brazilian Portuguese', () => {
    visitPin({ locale: 'pt_BR' });
    cy.get('[data-testid="clients-card"] h2').should('have.text', 'Gerenciamento de Dispositivos');
    row('phone-uuid').find('[data-testid="client-name"]').should('have.text', 'Cliente desconhecido');
  });
});

describe('clients: editor', () => {
  it('toggles permissions, with implied ones disabled, and keeps the badge live', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="edit-perm-badge"]').should('have.text', '[ 03 00 00 ]');
    cy.get('[data-testid="perm-list"]').should('be.disabled').and('have.attr', 'data-granted', 'true');
    cy.get('[data-testid="perm-launch"]').click();
    cy.get('[data-testid="edit-perm-badge"]')
      .should('have.text', '[ 07 00 00 ]')
      .and('have.attr', 'data-danger', 'true');
    cy.get('[data-testid="perm-view"]').should('be.disabled');
    cy.get('[data-testid="perm-input_kbd"]').click();
    cy.get('[data-testid="edit-perm-badge"]').should('have.text', '[ 07 00 10 ]');
    cy.get('[data-testid="perm-launch"]').click();
    cy.get('[data-testid="perm-view"]').should('be.enabled');
    cy.get('[data-testid="perm-file_upload"]').should('not.exist');
  });

  it('has one editor at a time and cancel restores the fields', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="edit-name"]').type(' edited');
    cy.get('[data-testid="perm-launch"]').click();
    row('phone-uuid').find('[data-testid="client-edit"]').click();
    cy.get('[data-testid="client-editor"]').should('have.length', 1);
    row('tablet-uuid').find('[data-testid="client-name"]').should('have.text', 'Tablet');
    cy.get('[data-testid="edit-cancel"]').click();
    cy.get('[data-testid="client-editor"]').should('not.exist');
    edit('tablet-uuid');
    cy.get('[data-testid="edit-name"]').should('have.value', 'Tablet');
    cy.get('[data-testid="edit-perm-badge"]').should('have.text', '[ 03 00 00 ]');
  });

  it('validates the display mode override', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="edit-display-mode"]').should('have.attr', 'placeholder', '1920x1080x59.94').type('1920x1080');
    cy.get('[data-testid="edit-display-mode-error"]').should(
      'have.text',
      'Invalid mode override. Format: [Width]x[Height]x[FPS]',
    );
    cy.get('[data-testid="edit-save"]').should('be.disabled');
    cy.get('[data-testid="edit-display-mode"]').type('x59.94');
    cy.get('[data-testid="edit-display-mode-error"]').should('not.exist');
    cy.get('[data-testid="edit-save"]').should('be.enabled');
  });

  it('hides the Windows-only fields on Linux and macOS', () => {
    for (const platform of ['linux', 'macos'] as const) {
      visitPin({ platform });
      edit('tablet-uuid');
      cy.contains('Enable legacy ordering').should('be.visible');
      cy.contains('Always create virtual display').should('not.exist');
      cy.contains('Run as Admin').should('not.exist');
      cy.contains('label', 'Elevated').should('not.exist');
    }
  });

  it('shows the Windows-only fields on Windows', () => {
    visitPin({ platform: 'windows' });
    edit('tablet-uuid');
    cy.contains('Always create virtual display').should('be.visible');
    cy.contains('Run as Admin').should('be.visible');
  });

  it('shows the command lists only while client commands are allowed', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="client-do-field"]').should('be.visible');
    cy.get('[data-testid="client-undo-field"]').should('be.visible');
    cy.get('[data-testid="client-commands"]').should('be.visible');
    cy.contains('label', 'Allow client commands').click();
    cy.get('[data-testid="client-commands"]').should('not.exist');
  });
});

describe('clients: save', () => {
  it('sends the exact body, keeping only commands with text, and refreshes the list', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="edit-name"]').clear().type('Living room');
    cy.get('[data-testid="perm-launch"]').click();
    cy.get('[data-testid="edit-display-mode"]').type(' 1920x1080x59.94 ');
    cy.contains('label', 'Enable legacy ordering').click();
    cy.get('[data-testid="client-do-cmd-insert-0"]').click();
    cy.get('[data-testid="client-do-cmd-row-1"] input:not([type="checkbox"])').first().type('  echo second  ');
    cy.get('[data-testid="client-do-cmd-add"]').click();
    cy.get('[data-testid="client-undo-cmd-add"]').click();
    cy.get('[data-testid="client-undo-cmd-row-0"] input:not([type="checkbox"])').first().type('echo bye');
    cy.get('[data-testid="edit-save"]').click();
    cy.wait('@update')
      .its('request.body')
      .should('deep.equal', {
        uuid: 'tablet-uuid',
        name: 'Living room',
        display_mode: '1920x1080x59.94',
        allow_client_commands: true,
        enable_legacy_ordering: false,
        always_use_virtual_display: false,
        perm: 0x07000000,
        do: [
          { cmd: 'echo up', elevated: false },
          { cmd: 'echo second', elevated: 'false' },
        ],
        undo: [{ cmd: 'echo bye', elevated: 'false' }],
      });
    cy.get('[data-testid="client-editor"]').should('not.exist');
    cy.wait('@list');
    cy.get('[data-testid="save-error"]').should('not.exist');
  });

  it('saves with Enter in the name field', () => {
    visitPin();
    edit('tablet-uuid');
    cy.get('[data-testid="edit-name"]').type('2{enter}');
    cy.wait('@update').its('request.body.name').should('eq', 'Tablet2');
  });

  it('shows the host message when the update is refused', () => {
    visitPin({ update: { status: false, message: 'unknown client' } });
    edit('tablet-uuid');
    cy.get('[data-testid="edit-save"]').click();
    cy.get('[data-testid="save-error"]').should('contain.text', 'Error while saving client: unknown client');
    cy.get('[data-testid="save-error-dismiss"]').click();
    cy.get('[data-testid="save-error"]').should('not.exist');
  });
});

describe('clients: disconnect and unpair', () => {
  it('disconnects a connected device', () => {
    visitPin();
    row('tablet-uuid').find('[data-testid="client-disconnect"]').click();
    cy.wait('@disconnect').its('request.body').should('deep.equal', { uuid: 'tablet-uuid' });
    cy.wait('@list');
  });

  it('unpairs one device and shows the notice until it is dismissed', () => {
    visitPin();
    row('phone-uuid').find('[data-testid="client-unpair"]').click();
    cy.wait('@unpair').its('request.body').should('deep.equal', { uuid: 'phone-uuid' });
    cy.get('[data-testid="unpair-notice"]').should('contain.text', 'the device(s) may still be in an active session');
    row('phone-uuid').should('not.exist');
    row('tablet-uuid').should('be.visible');
    cy.get('[data-testid="unpair-notice-dismiss"]').click();
    cy.get('[data-testid="unpair-notice"]').should('not.exist');
  });

  it('asks before unpairing all and sends nothing when cancelled', () => {
    visitPin();
    cy.get('[data-testid="unpair-all"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('contain.text', 'Unpair all devices?');
    cy.get('[data-testid="confirm-cancel"]').click();
    cy.get('@unpairAll.all').should('have.length', 0);
    row('tablet-uuid').should('be.visible');
  });

  it('unpairs all devices after the confirmation and reports it', () => {
    visitPin();
    cy.get('[data-testid="unpair-all"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.wait('@unpairAll');
    cy.get('[data-testid="unpair-all-status"]')
      .should('have.attr', 'data-status', 'success')
      .and('have.text', 'All devices unpaired.');
    cy.get('[data-testid="clients-empty"]').should('be.visible');
    cy.get('[data-testid="unpair-all"]').should('be.enabled');
  });

  it('reports a refused unpair-all', () => {
    visitPin({ unpairAll: { status: false } });
    cy.get('[data-testid="unpair-all"]').click();
    cy.get('[data-testid="confirm-accept"]').click();
    cy.get('[data-testid="unpair-all-status"]')
      .should('have.attr', 'data-status', 'error')
      .and('have.text', 'Error while unpairing');
    row('tablet-uuid').should('be.visible');
  });
});
