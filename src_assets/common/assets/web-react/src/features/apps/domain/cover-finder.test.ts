import { describe, expect, it } from 'vitest';
import { coverNameKey, coverSearchBucket, matchingBucketEntries, toCoverCandidate } from './cover-finder';

describe('coverSearchBucket', () => {
  it.each([
    ['Doom', 'do'],
    ['DOOM', 'do'],
    ['a', 'a'],
    ['1942', '19'],
    ['  Doom', '@'],
  ])('buckets %j', (name, expected) => {
    expect(coverSearchBucket(name)).toBe(expected);
  });

  it('drops non alphanumerics of the first two characters only', () => {
    expect(coverSearchBucket('A-Train')).toBe('a');
    expect(coverSearchBucket('!Doom')).toBe('d');
    expect(coverSearchBucket('!?x')).toBe('@');
    expect(coverSearchBucket('')).toBe('@');
  });
});

describe('coverNameKey', () => {
  it('turns whitespace runs into a dot and lower-cases', () => {
    expect(coverNameKey('The  Witcher\t3')).toBe('the.witcher.3');
  });
});

describe('matchingBucketEntries', () => {
  const bucket = {
    '1': { name: 'Doom' },
    '2': { name: 'Doom Eternal' },
    '3': { name: 'Doodle Jump' },
    '4': { name: 42 },
    '5': null,
  };

  it('keeps the names that start with the searched name, ignoring case and spacing', () => {
    expect(matchingBucketEntries(bucket, 'doom')).toEqual([
      { id: '1', name: 'Doom' },
      { id: '2', name: 'Doom Eternal' },
    ]);
    expect(matchingBucketEntries(bucket, 'DOOM  ETERNAL')).toEqual([{ id: '2', name: 'Doom Eternal' }]);
  });

  it('yields nothing for a malformed bucket', () => {
    expect(matchingBucketEntries(null, 'x')).toEqual([]);
    expect(matchingBucketEntries('x', 'x')).toEqual([]);
  });
});

describe('toCoverCandidate', () => {
  it('builds the preview and save URLs from the slug of the thumb', () => {
    expect(
      toCoverCandidate({
        id: 7,
        name: 'Doom',
        cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1abc.jpg' },
      }),
    ).toEqual({
      name: 'Doom',
      key: 'igdb_7',
      url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg',
      saveUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1abc.png',
    });
  });

  it('rejects games without a usable cover', () => {
    expect(toCoverCandidate(null)).toBeNull();
    expect(toCoverCandidate({ id: 1, name: 'x' })).toBeNull();
    expect(toCoverCandidate({ id: 1, name: 'x', cover: { url: '' } })).toBeNull();
    expect(toCoverCandidate({ id: 1, name: 'x', cover: { url: 'nodots' } })).toBeNull();
    expect(toCoverCandidate({ id: 1, name: 'x', cover: { url: 'a.b' } })).toBeNull();
  });
});
