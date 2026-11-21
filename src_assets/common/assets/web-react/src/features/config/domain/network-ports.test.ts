import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOONLIGHT_PORT,
  effectivePort,
  needsHttpPortNote,
  networkPortAlerts,
  networkPortRows,
} from './network-ports';

describe('effectivePort', () => {
  it('reads numbers and numeric strings like the legacy `+port`', () => {
    expect(effectivePort(47989)).toBe(47989);
    expect(effectivePort('47989')).toBe(47989);
    expect(effectivePort('')).toBe(0);
    expect(Number.isNaN(effectivePort('abc'))).toBe(true);
  });
});

describe('networkPortRows', () => {
  it('derives the Helios port table from the default port', () => {
    expect(networkPortRows(DEFAULT_MOONLIGHT_PORT)).toEqual([
      { protocol: 'tcp', purpose: 'https', from: 47984, to: 47984 },
      { protocol: 'tcp', purpose: 'http', from: 47989, to: 47989 },
      { protocol: 'tcp', purpose: 'web_ui', from: 47990, to: 47990 },
      { protocol: 'tcp', purpose: 'rtsp', from: 48010, to: 48010 },
      { protocol: 'udp', purpose: 'media', from: 47998, to: 48000 },
    ]);
  });

  it('shifts every port with the base port', () => {
    const rows = networkPortRows(1029);
    expect(rows.map((row) => [row.from, row.to])).toEqual([
      [1024, 1024],
      [1029, 1029],
      [1030, 1030],
      [1050, 1050],
      [1038, 1040],
    ]);
  });
});

describe('needsHttpPortNote', () => {
  it('is false only for the default base port', () => {
    expect(needsHttpPortNote(47989)).toBe(false);
    expect(needsHttpPortNote(47990)).toBe(true);
    expect(needsHttpPortNote(NaN)).toBe(true);
  });
});

describe('networkPortAlerts', () => {
  it.each([
    [1028, true, false],
    [1029, false, false],
    [47989, false, false],
    [65514, false, false],
    [65515, false, true],
  ])('port %i -> lowPort %s, highPort %s', (port, lowPort, highPort) => {
    expect(networkPortAlerts(port)).toEqual({ lowPort, highPort });
  });

  it('warns about low ports for an empty port (legacy `+""` is 0)', () => {
    expect(networkPortAlerts(effectivePort(''))).toEqual({ lowPort: true, highPort: false });
  });

  it('shows no alert for a non-numeric port (NaN comparisons are false)', () => {
    expect(networkPortAlerts(NaN)).toEqual({ lowPort: false, highPort: false });
  });
});
