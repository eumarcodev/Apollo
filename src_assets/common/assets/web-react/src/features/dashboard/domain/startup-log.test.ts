import { describe, expect, it } from 'vitest';
import { fatalEntries, parseLogEntries } from './startup-log';

const LOG = [
  '[2026-11-20 10:00:00.123]: Info: Helios version [1.0.0]',
  '[2026-11-20 10:00:01.456]: Fatal: Unable to find display or encoder during startup.',
  'Check the GPU driver.',
  '[2026-11-20 10:00:02.789]: Warning: Something minor',
  '',
].join('\n');

describe('parseLogEntries', () => {
  it('pairs every timestamp with its text and level', () => {
    expect(parseLogEntries(LOG)).toEqual([
      { timestamp: '[2026-11-20 10:00:00.123]', level: 'Info', value: 'Info: Helios version [1.0.0]\n' },
      {
        timestamp: '[2026-11-20 10:00:01.456]',
        level: 'Fatal',
        value: 'Fatal: Unable to find display or encoder during startup.\nCheck the GPU driver.\n',
      },
      { timestamp: '[2026-11-20 10:00:02.789]', level: 'Warning', value: 'Warning: Something minor\n' },
    ]);
  });

  it('returns nothing for empty, missing or unformatted logs', () => {
    expect(parseLogEntries('')).toEqual([]);
    expect(parseLogEntries(null)).toEqual([]);
    expect(parseLogEntries(undefined)).toEqual([]);
    expect(parseLogEntries('just text without timestamps')).toEqual([]);
  });

  it('keeps an entry whose message is empty', () => {
    expect(parseLogEntries('[2026-11-20 10:00:00.123]: ')).toEqual([
      { timestamp: '[2026-11-20 10:00:00.123]', level: '', value: '' },
    ]);
  });
});

describe('fatalEntries', () => {
  it('keeps only the Fatal level', () => {
    const entries = parseLogEntries(LOG);
    expect(fatalEntries(entries).map((entry) => entry.timestamp)).toEqual(['[2026-11-20 10:00:01.456]']);
    expect(fatalEntries([])).toEqual([]);
  });
});
