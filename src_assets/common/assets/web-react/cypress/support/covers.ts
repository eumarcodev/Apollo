/** Stubs of the online cover sources (LizardByte GameDB and IGDB images): the specs never reach the real sites. */
const DB = 'https://raw.githubusercontent.com/LizardByte/GameDB/gh-pages';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="264" height="352"><rect width="264" height="352" fill="#b8860b"/></svg>';

export interface StubGameDbOptions {
  /** Answer the bucket with this status instead of the games below (error state). */
  bucketStatus?: number;
}

/** Bucket `do` holds Doom, Doom Eternal and an unrelated game; the unrelated one must never be requested. */
export function stubGameDb({ bucketStatus = 200 }: StubGameDbOptions = {}) {
  cy.intercept({ method: 'GET', url: `${DB}/buckets/*.json` }, (req) => {
    if (bucketStatus !== 200) {
      req.reply({ statusCode: bucketStatus, body: 'unavailable' });
      return;
    }
    const bucket = req.url.endsWith('/do.json')
      ? { '1': { name: 'Doom' }, '2': { name: 'Doom Eternal' }, '3': { name: 'Doodle Jump' } }
      : {};
    req.reply({ statusCode: 200, body: bucket });
  }).as('gamedbBucket');
  cy.intercept(
    { method: 'GET', url: `${DB}/games/1.json` },
    {
      body: { id: 1, name: 'Doom', cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1doom.jpg' } },
    },
  ).as('gamedbGame1');
  cy.intercept(
    { method: 'GET', url: `${DB}/games/2.json` },
    {
      body: {
        id: 2,
        name: 'Doom Eternal',
        cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co2eternal.jpg' },
      },
    },
  ).as('gamedbGame2');
  cy.intercept({ method: 'GET', url: `${DB}/games/3.json` }, { statusCode: 500, body: 'must not be requested' }).as(
    'gamedbGame3',
  );
  cy.intercept(
    { method: 'GET', hostname: 'images.igdb.com' },
    {
      statusCode: 200,
      headers: { 'content-type': 'image/svg+xml' },
      body: SVG,
    },
  ).as('igdbImage');
}
