import { loginInstalled } from '../../support/installed';

interface Cert {
  name: string;
  uuid: string;
  display_mode: string;
  perm: string | number;
  allow_client_commands: boolean;
  enable_legacy_ordering: boolean;
  always_use_virtual_display: boolean;
  do?: unknown[];
  undo?: unknown[];
}

function listClients(): Cypress.Chainable<Cert[]> {
  return cy
    .request<{ status: boolean; named_certs?: Cert[] }>('/api/clients/list')
    .then((response) => (response.body.status && response.body.named_certs ? response.body.named_certs : []));
}

// Read-only, plus one reversible edit when a device is paired: rename and restore. Nothing is disconnected or unpaired.
describe('installed clients: device management of the installed host', () => {
  let original: Cert | undefined;

  before(() => {
    loginInstalled();
    listClients().then((clients) => {
      original = clients[0];
    });
  });

  beforeEach(() => {
    loginInstalled();
  });

  after(() => {
    // Put the name back through the API even when a test failed half way (same body the editor sends).
    loginInstalled();
    if (!original) {
      return;
    }
    const first = original;
    listClients().then((clients) => {
      const current = clients.find((cert) => cert.uuid === first.uuid);
      if (current && current.name !== first.name) {
        cy.request({
          method: 'POST',
          url: '/api/clients/update',
          headers: { 'Content-Type': 'application/json' },
          body: {
            uuid: first.uuid,
            name: first.name,
            display_mode: first.display_mode,
            allow_client_commands: first.allow_client_commands,
            enable_legacy_ordering: first.enable_legacy_ordering,
            always_use_virtual_display: first.always_use_virtual_display,
            perm: Number(first.perm),
            do: first.do ?? [],
            undo: first.undo ?? [],
          },
        })
          .its('status')
          .should('eq', 200);
      }
    });
  });

  it('shows the device management card with the devices the host lists', () => {
    cy.visit('/pin');
    cy.get('[data-testid="clients-card"]').should('be.visible');
    cy.get('[data-testid="unpair-all"]').should('be.visible');
    listClients().then((clients) => {
      if (clients.length === 0) {
        cy.get('[data-testid="clients-empty"]').should('be.visible');
      } else {
        cy.get('[data-testid="client-list"] > li').should('have.length', clients.length);
        cy.get(`[data-testid="client-${clients[0]!.uuid}"] [data-testid="client-perm"]`).should('contain.text', '[ ');
      }
    });
  });

  it('opens and cancels the editor of the first device without saving', function () {
    if (!original) {
      this.skip();
    }
    cy.visit('/pin');
    cy.get(`[data-testid="client-${original!.uuid}"] [data-testid="client-edit"]`).click();
    cy.get('[data-testid="client-editor"]').should('be.visible');
    cy.get('[data-testid="edit-name"]').should('have.value', original!.name);
    cy.get('[data-testid="edit-cancel"]').click();
    cy.get('[data-testid="client-editor"]').should('not.exist');
  });

  it('renames the first device and puts the name back', function () {
    if (!original) {
      this.skip();
    }
    const first = original!;
    const renamed = `${first.name} (e2e)`;
    cy.intercept({ method: 'POST', pathname: '/api/clients/update' }).as('update');
    cy.visit('/pin');
    cy.get(`[data-testid="client-${first.uuid}"] [data-testid="client-edit"]`).click();
    cy.get('[data-testid="edit-name"]').clear().type(renamed);
    cy.get('[data-testid="edit-save"]').click();
    cy.wait('@update').its('response.statusCode').should('eq', 200);
    cy.get(`[data-testid="client-${first.uuid}"] [data-testid="client-name"]`).should('have.text', renamed);

    cy.get(`[data-testid="client-${first.uuid}"] [data-testid="client-edit"]`).click();
    cy.get('[data-testid="edit-name"]').clear();
    if (first.name) {
      cy.get('[data-testid="edit-name"]').type(first.name);
    }
    cy.get('[data-testid="edit-save"]').click();
    cy.wait('@update').its('response.statusCode').should('eq', 200);
    listClients().then((clients) => {
      expect(clients.find((cert) => cert.uuid === first.uuid)?.name).to.equal(first.name);
    });
  });
});
