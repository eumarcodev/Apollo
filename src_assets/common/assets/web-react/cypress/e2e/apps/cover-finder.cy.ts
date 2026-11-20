import { stubServerApi, type StubLocale } from '../../support/api';
import { stubGameDb } from '../../support/covers';

function visitEditor(locale: StubLocale = 'en') {
  stubServerApi({
    locale,
    overrides: {
      'GET /api/apps': { statusCode: 200, body: { apps: [], current_app: '', host_name: 'Test PC', host_uuid: 'H' } },
    },
  });
  cy.visit('/apps');
  cy.wait('@config');
  cy.get('[data-testid="add-app"]').click();
  cy.get('[data-testid="app-editor"]').should('be.visible');
}

function typeName(name: string) {
  cy.get('[data-testid="appName"]').clear().type(name);
}

describe('apps cover finder (stubbed GameDB and IGDB)', () => {
  it('lists the covers of the typed name and sets the image path with the stored cover', () => {
    stubGameDb();
    visitEditor();
    cy.intercept(
      { method: 'POST', pathname: '/api/covers/upload' },
      { body: { status: true, path: 'C:/covers/igdb_2.png' } },
    ).as('upload');
    typeName('  Doom ');
    cy.get('[data-testid="cover-finder-slot"] [data-testid="cover-finder-open"]')
      .should('contain.text', 'Find Cover (Online)')
      .click();
    cy.get('[data-testid="cover-finder-dialog"]').should('contain.text', 'Covers Found');
    cy.get('[data-testid="cover-igdb_1"]').should('contain.text', 'Doom');
    cy.get('[data-testid="cover-igdb_2"]').should('contain.text', 'Doom Eternal');
    cy.get('[data-testid="cover-finder-results"] li').should('have.length', 2);
    cy.get('[data-testid="cover-igdb_2"] img').should(
      'have.attr',
      'src',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co2eternal.jpg',
    );
    cy.get('@gamedbGame3.all').should('have.length', 0);
    cy.get('[data-testid="cover-igdb_2"]').click();
    cy.wait('@upload').its('request.body').should('deep.equal', {
      key: 'igdb_2',
      url: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2eternal.png',
    });
    cy.get('[data-testid="cover-finder-dialog"]').should('not.exist');
    cy.get('[data-testid="appImagePath"]').should('have.value', 'C:/covers/igdb_2.png');
  });

  it('shows the empty state when no game matches', () => {
    stubGameDb();
    visitEditor();
    typeName('Zzzz');
    cy.get('[data-testid="cover-finder-open"]').click();
    cy.get('[data-testid="cover-finder-empty"]').should('have.text', 'No covers found for this name.');
  });

  it('shows the error state when the GameDB bucket cannot be read', () => {
    stubGameDb({ bucketStatus: 503 });
    visitEditor();
    typeName('Doom');
    cy.get('[data-testid="cover-finder-open"]').click();
    cy.get('[data-testid="cover-finder-error"]').should('contain.text', 'The cover search failed');
  });

  it('keeps the popup open and shows the reason when the host fails to download', () => {
    stubGameDb();
    visitEditor();
    cy.intercept(
      { method: 'POST', pathname: '/api/covers/upload' },
      { statusCode: 400, body: { status: false, error: 'Failed to download cover' } },
    );
    typeName('Doom');
    cy.get('[data-testid="cover-finder-open"]').click();
    cy.get('[data-testid="cover-igdb_1"]').click();
    cy.get('[data-testid="cover-finder-pick-error"]').should('contain.text', 'Could not download the cover');
    cy.get('[data-testid="appImagePath"]').should('have.value', '');
    cy.get('[data-testid="cover-finder-close"]').click();
    cy.get('[data-testid="cover-finder-dialog"]').should('not.exist');
  });

  it('is translated to Portuguese', () => {
    stubGameDb();
    visitEditor('pt_BR');
    typeName('Doom');
    cy.get('[data-testid="cover-finder-open"]').should('contain.text', 'Buscar capa (online)').click();
    cy.get('[data-testid="cover-finder-dialog"]').should('contain.text', 'Capas encontradas');
  });
});
