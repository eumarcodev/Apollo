import type { StaticResponse } from 'cypress/types/net-stubbing';
import { stubServerApi, type StubLocale } from '../../support/api';

const OTP_ANSWER = {
  otp: '4321',
  ip: '10.0.0.5',
  name: 'Helios PC',
  status: true,
  message: 'OTP created, effective within 3 minutes.',
};

/** The client port is the page port - 1 (the web UI listens on the streaming port + 1). */
function streamingPort(): number {
  return Number(new URL(Cypress.config('baseUrl') ?? 'http://localhost').port) - 1;
}

interface VisitOptions {
  hash?: string;
  locale?: StubLocale;
  pin?: StaticResponse;
  otp?: StaticResponse;
}

function visitPin({ hash = '', locale = 'en', pin, otp }: VisitOptions = {}) {
  stubServerApi({
    locale,
    overrides: {
      'POST /api/pin': pin ?? { statusCode: 200, body: { status: true } },
      'POST /api/otp': otp ?? { statusCode: 200, body: OTP_ANSWER },
    },
  });
  cy.intercept({ method: 'POST', pathname: '/api/pin' }).as('pin');
  cy.intercept({ method: 'POST', pathname: '/api/otp' }).as('otp');
  cy.visit(`/pin${hash}`, {
    onBeforeLoad(win) {
      win.sessionStorage.clear();
    },
  });
}

describe('pairing: tabs', () => {
  it('opens the OTP tab by default with the notices and the placeholder code', () => {
    visitPin();
    cy.get('h1').should('have.text', 'PIN');
    cy.get('[data-testid="tab-otp"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="otp-code"]').should('have.text', '????');
    cy.get('[data-testid="otp-qr"]').should('not.exist');
    cy.get('[data-testid="otp-info"]').should('contain.text', 'latest Selene clients');
    cy.get('[data-testid="pairing-warning"]').should('contain.text', 'Warning!');
    cy.get('[data-testid="otp-passphrase"]').should('be.focused');
  });

  it('opens the PIN tab from #PIN and switches back, updating the hash', () => {
    visitPin({ hash: '#PIN' });
    cy.get('[data-testid="tab-pin"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="pin-input"]').should('be.focused');
    cy.get('[data-testid="otp-info"]').should('not.exist');
    cy.get('[data-testid="tab-otp"]').click();
    cy.location('hash').should('eq', '#OTP');
    cy.get('[data-testid="otp-form"]').should('be.visible');
    cy.get('[data-testid="tab-pin"]').click();
    cy.location('hash').should('eq', '#PIN');
  });

  it('starts the OTP tab over after a switch', () => {
    visitPin();
    cy.get('[data-testid="otp-passphrase"]').type('abcd');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-code"]').should('have.text', '4321');
    cy.get('[data-testid="tab-pin"]').click();
    cy.get('[data-testid="tab-otp"]').click();
    cy.get('[data-testid="otp-code"]').should('have.text', '????');
    cy.get('[data-testid="otp-passphrase"]').should('have.value', '');
    cy.get('[data-testid="otp-message"]').should('not.exist');
  });
});

describe('pairing: PIN', () => {
  it('sends the PIN and the name, clears the form and shows the permission notice', () => {
    visitPin({ hash: '#PIN' });
    cy.get('[data-testid="pin-input"]').type('1234');
    cy.get('[data-testid="pin-device-name"]').type('Living room TV');
    cy.get('[data-testid="pin-submit"]').click();
    cy.wait('@pin').then(({ request }) => {
      expect(request.headers['content-type']).to.contain('application/json');
      expect(request.body).to.deep.equal({ pin: '1234', name: 'Living room TV' });
    });
    cy.get('[data-testid="pin-status"]')
      .should('have.attr', 'data-status', 'success')
      .and('contain.text', 'Success! Please check Moonlight to continue');
    cy.get('[data-testid="pin-input"]').should('have.value', '');
    cy.get('[data-testid="pin-device-name"]').should('have.value', '');
    cy.get('[data-testid="paired-notice"]').should('contain.text', 'Please grant necessary permissions');
    cy.get('[data-testid="paired-notice-dismiss"]').click();
    cy.get('[data-testid="paired-notice"]').should('not.exist');
  });

  it('reports a refused PIN, also on a 400 answer', () => {
    visitPin({ hash: '#PIN', pin: { statusCode: 200, body: { status: false } } });
    cy.get('[data-testid="pin-input"]').type('0000');
    cy.get('[data-testid="pin-submit"]').click();
    cy.get('[data-testid="pin-status"]')
      .should('have.attr', 'data-status', 'failure')
      .and('contain.text', 'Pairing Failed: Check if the PIN is typed correctly');
    cy.get('[data-testid="pin-input"]').should('have.value', '0000');
    cy.intercept(
      { method: 'POST', pathname: '/api/pin' },
      { statusCode: 400, body: { status_code: 400, status: false, error: 'bad' } },
    );
    cy.get('[data-testid="pin-submit"]').click();
    cy.get('[data-testid="pin-status"]').should('have.attr', 'data-status', 'failure');
    cy.get('[data-testid="paired-notice"]').should('not.exist');
  });

  it('does not send an empty or non-numeric PIN', () => {
    visitPin({ hash: '#PIN' });
    cy.get('[data-testid="pin-submit"]').click();
    cy.get('[data-testid="pin-input"]').type('12ab');
    cy.get('[data-testid="pin-submit"]').click();
    cy.get('[data-testid="pin-input"]').then(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valid).to.equal(false);
    });
    cy.get('@pin.all').should('have.length', 0);
  });
});

describe('pairing: OTP', () => {
  it('requests an OTP and shows it with the QR code of the art:// deep link', () => {
    visitPin();
    cy.window().then((win) => {
      cy.stub(win, 'open').as('open');
    });
    cy.get('[data-testid="otp-passphrase"]').type('abcd');
    cy.get('[data-testid="otp-device-name"]').type('Tablet');
    cy.get('[data-testid="otp-submit"]').click();
    cy.wait('@otp').its('request.body').should('deep.equal', { passphrase: 'abcd', deviceName: 'Tablet' });
    const link = `art://10.0.0.5:${streamingPort()}?pin=4321&passphrase=abcd&name=Helios%20PC`;
    cy.get('[data-testid="otp-code"]').should('have.text', '4321');
    cy.get('[data-testid="otp-qr"]').should('have.attr', 'data-value', link).find('svg').should('be.visible');
    cy.get('[data-testid="otp-link"]')
      .should('have.attr', 'href', link)
      .and('have.text', `art://10.0.0.5:${streamingPort()}`);
    cy.get('[data-testid="otp-message"]')
      .should('have.attr', 'data-status', 'success')
      .and('contain.text', 'PIN request success');
    // Opened on the host itself (localhost): no "pair now" prompt.
    cy.get('[data-testid="confirm-dialog"]').should('not.exist');
    cy.get('@open').should('not.have.been.called');
  });

  it('refuses a passphrase shorter than 4 letters or digits', () => {
    visitPin();
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-passphrase"]').type('ab1');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-passphrase"]').clear().type('ab-12');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('@otp.all').should('have.length', 0);
  });

  it('shows the message of a refused OTP and no alert for a 400 without one', () => {
    visitPin({ otp: { statusCode: 200, body: { status: false, message: 'OTP already pending' } } });
    cy.get('[data-testid="otp-passphrase"]').type('abcd');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-message"]')
      .should('have.attr', 'data-status', 'danger')
      .and('have.text', 'OTP already pending');
    cy.intercept(
      { method: 'POST', pathname: '/api/otp' },
      { statusCode: 400, body: { status_code: 400, status: false, error: 'Passphrase too short!' } },
    ).as('otp400');
    cy.get('[data-testid="otp-submit"]').click();
    cy.wait('@otp400');
    cy.get('[data-testid="otp-message"]').should('not.exist');
    cy.get('[data-testid="otp-code"]').should('have.text', '????');
  });

  it('expires the OTP after 3 minutes', () => {
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
    visitPin();
    cy.get('[data-testid="otp-passphrase"]').type('abcd');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-code"]').should('have.text', '4321');
    cy.tick(3 * 60 * 1000 - 1000);
    cy.get('[data-testid="otp-code"]').should('have.text', '4321');
    cy.tick(1000);
    cy.get('[data-testid="otp-code"]').should('have.text', 'EXPIRED');
    cy.get('[data-testid="otp-message"]')
      .should('have.attr', 'data-status', 'warning')
      .and('contain.text', 'OTP expired. Please request a new one.');
    cy.get('[data-testid="otp-passphrase"]').should('have.value', '');
    cy.get('[data-testid="otp-qr"]').should('not.exist');
  });
});

describe('pairing: host of the deep link', () => {
  it('edits the host, redraws the QR and keeps the host for the session', () => {
    visitPin();
    cy.get('[data-testid="otp-passphrase"]').type('abcd');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="host-edit"]').click();
    cy.get('[data-testid="otp-form"]').should('not.exist');
    cy.get('[data-testid="host-addr"]').should('have.value', '10.0.0.5').clear();
    cy.get('[data-testid="host-save"]').should('be.disabled');
    cy.get('[data-testid="host-addr"]').type('gaming-pc.lan');
    cy.get('[data-testid="host-port"]').clear().type('50000');
    cy.get('[data-testid="host-save"]').click();
    const link = 'art://gaming-pc.lan:50000?pin=4321&passphrase=abcd&name=Helios%20PC';
    cy.get('[data-testid="otp-qr"]').should('have.attr', 'data-value', link);
    cy.get('[data-testid="otp-link"]').should('have.attr', 'href', link);
    cy.window()
      .its('sessionStorage')
      .invoke('getItem', 'hostInfo')
      .should('eq', '{"hostAddr":"gaming-pc.lan","hostPort":"50000"}');

    // A reload keeps the typed host for the next OTP (sessionStorage), not the reported address.
    cy.reload();
    cy.get('[data-testid="otp-passphrase"]').type('wxyz');
    cy.get('[data-testid="otp-submit"]').click();
    cy.get('[data-testid="otp-link"]').should('have.text', 'art://gaming-pc.lan:50000');
  });
});

describe('pairing: translations', () => {
  it('is translated to Portuguese', () => {
    visitPin({ locale: 'pt_BR' });
    cy.get('[data-testid="tab-otp"]').should('contain.text', 'Pareamento por OTP');
    cy.get('[data-testid="tab-pin"]').should('contain.text', 'Pareamento por PIN');
    cy.get('[data-testid="otp-submit"]').should('contain.text', 'Gerar PIN');
    cy.get('[data-testid="pairing-warning"]').should('contain.text', 'Atenção!');
  });
});
