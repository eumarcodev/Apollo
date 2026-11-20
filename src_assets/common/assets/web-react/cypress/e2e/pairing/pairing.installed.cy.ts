import { loginInstalled } from '../../support/installed';

// Non-destructive: nothing is paired. The only write is one OTP request, which the host forgets after 3 minutes.
describe('installed pairing: the PIN page of the installed host', () => {
  beforeEach(() => {
    loginInstalled();
  });

  it('renders the OTP tab by default and switches to the PIN tab', () => {
    cy.visit('/pin');
    cy.get('h1').should('be.visible');
    cy.get('[data-testid="tab-otp"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="otp-code"]').should('have.text', '????');
    cy.get('[data-testid="pairing-warning"]').should('be.visible');
    cy.get('[data-testid="tab-pin"]').click();
    cy.location('hash').should('eq', '#PIN');
    cy.get('[data-testid="pin-form"]').should('be.visible');
    cy.get('[data-testid="otp-info"]').should('not.exist');
  });

  it('opens the PIN tab from #PIN', () => {
    cy.visit('/pin#PIN');
    cy.get('[data-testid="tab-pin"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="pin-input"]').should('be.visible');
  });

  it('gets an OTP from POST /api/otp and shows it with the deep link (no pairing)', () => {
    cy.intercept({ method: 'POST', pathname: '/api/otp' }).as('otp');
    cy.visit('/pin', {
      onBeforeLoad(win) {
        win.sessionStorage.removeItem('hostInfo');
      },
    });
    cy.get('[data-testid="otp-passphrase"]').type('e2etest');
    cy.get('[data-testid="otp-device-name"]').type('Cypress');
    cy.get('[data-testid="otp-submit"]').click();
    cy.wait('@otp').then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      const body = response?.body as { status: boolean; otp: string; ip: string };
      expect(body.status).to.equal(true);
      expect(body.otp).to.match(/^\d{4}$/);
      cy.get('[data-testid="otp-code"]').should('have.text', body.otp);
      cy.get('[data-testid="otp-message"]').should('have.attr', 'data-status', 'success');
      if (body.ip) {
        const port = Number(new URL(Cypress.config('baseUrl') ?? 'https://localhost:47990').port) - 1;
        cy.get('[data-testid="otp-link"]').should('have.text', `art://${body.ip}:${port}`);
        cy.get('[data-testid="otp-qr"] svg').should('be.visible');
      }
    });
    // localhost: no "pair now" prompt, so nothing is opened.
    cy.get('[data-testid="confirm-dialog"]').should('not.exist');
  });
});
