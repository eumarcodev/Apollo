import { describe, expect, it } from 'vitest';
import { charsetOf, decodeLogBody, filterLogLines } from './log-text';

describe('charsetOf', () => {
  it('reads the charset parameter, ignoring case and spaces', () => {
    expect(charsetOf('text/plain; charset=windows-1252')).toBe('windows-1252');
    expect(charsetOf('text/plain;CHARSET= GBK ;x=1')).toBe('GBK');
  });

  it('defaults to utf-8', () => {
    expect(charsetOf('text/plain')).toBe('utf-8');
    expect(charsetOf('')).toBe('utf-8');
    expect(charsetOf(null)).toBe('utf-8');
    expect(charsetOf(undefined)).toBe('utf-8');
  });
});

describe('decodeLogBody', () => {
  it('decodes with the declared charset', () => {
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]); // "cafe" with e-acute in windows-1252
    expect(decodeLogBody(bytes.buffer, 'text/plain; charset=windows-1252')).toBe('café');
  });

  it('decodes utf-8 by default', () => {
    const bytes = new TextEncoder().encode('ação');
    expect(decodeLogBody(bytes.buffer as ArrayBuffer, 'text/plain')).toBe('ação');
  });

  it('throws for a charset the runtime does not know', () => {
    expect(() => decodeLogBody(new ArrayBuffer(1), 'text/plain; charset=nope-1')).toThrow(RangeError);
  });
});

describe('filterLogLines', () => {
  const logs = 'Info: one\nWarning: two\ninfo: three\nInfo: four';

  it('returns everything for an empty filter', () => {
    expect(filterLogLines(logs, '')).toBe(logs);
  });

  it('keeps the lines that contain the text, case-sensitive', () => {
    expect(filterLogLines(logs, 'Info')).toBe('Info: one\nInfo: four');
    expect(filterLogLines(logs, 'info')).toBe('info: three');
  });

  it('returns an empty text when nothing matches', () => {
    expect(filterLogLines(logs, 'Fatal')).toBe('');
  });
});
