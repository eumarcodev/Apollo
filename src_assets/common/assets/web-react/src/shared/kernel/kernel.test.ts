import { describe, expect, it } from 'vitest';
import {
  AppError,
  createBooleanCodec,
  err,
  fieldId,
  insertAt,
  isPlatform,
  mapToBoolRepresentation,
  ok,
  parseBooleanDefault,
  parsePlatform,
  removeAt,
  replaceAt,
  toResult,
} from './index';

describe('boolean codec', () => {
  it.each([
    [true, [true, false]],
    [false, [true, false]],
    [1, [1, 0]],
    [0, [1, 0]],
    ['true', ['true', 'false']],
    ['false', ['true', 'false']],
    ['1', ['1', '0']],
    ['0', ['1', '0']],
    ['enabled', ['enabled', 'disabled']],
    ['disabled', ['enabled', 'disabled']],
    ['enable', ['enable', 'disable']],
    ['disable', ['enable', 'disable']],
    ['yes', ['yes', 'no']],
    ['no', ['yes', 'no']],
    ['on', ['on', 'off']],
    ['off', ['on', 'off']],
  ])('detects %j as the pair %j', (value, pair) => {
    expect(mapToBoolRepresentation(value)?.pair).toEqual(pair);
  });

  it('matches strings case-insensitively and trimmed', () => {
    expect(mapToBoolRepresentation('  Enabled ')).toEqual({ pair: ['enabled', 'disabled'], value: 'enabled' });
    expect(mapToBoolRepresentation('OFF')?.pair).toEqual(['on', 'off']);
  });

  it('returns null for unknown values', () => {
    expect(mapToBoolRepresentation('maybe')).toBeNull();
    expect(mapToBoolRepresentation(null)).toBeNull();
    expect(mapToBoolRepresentation(2)).toBeNull();
  });

  it('writes back the same representation', () => {
    const codec = createBooleanCodec('disabled');
    expect(codec.recognized).toBe(true);
    expect(codec.isOn('disabled')).toBe(false);
    expect(codec.isOn('enabled')).toBe(true);
    expect(codec.encode(true)).toBe('enabled');
    expect(codec.encode(false)).toBe('disabled');
  });

  it('keeps numbers as numbers and compares loosely like the legacy checkbox', () => {
    const codec = createBooleanCodec(0);
    expect(codec.encode(true)).toBe(1);
    expect(codec.isOn('1')).toBe(true);
    expect(codec.isOn(0)).toBe(false);
  });

  it('swaps the values with inverseValues', () => {
    const codec = createBooleanCodec('true', true);
    expect(codec.truthy).toBe('false');
    expect(codec.falsy).toBe('true');
    expect(codec.isOn('false')).toBe(true);
    expect(codec.encode(true)).toBe('false');
  });

  it('falls back to "true"/"false" for unknown values', () => {
    const codec = createBooleanCodec('maybe');
    expect(codec.recognized).toBe(false);
    expect(codec.encode(true)).toBe('true');
    expect(codec.encode(false)).toBe('false');
  });

  it('parses defaults', () => {
    expect(parseBooleanDefault('true')).toBe(true);
    expect(parseBooleanDefault('disabled')).toBe(false);
    expect(parseBooleanDefault(1)).toBe(true);
    expect(parseBooleanDefault(false)).toBe(false);
    expect(parseBooleanDefault(null)).toBeNull();
    expect(parseBooleanDefault(undefined)).toBeNull();
  });
});

describe('platform', () => {
  it('accepts only the three server platforms', () => {
    expect(isPlatform('windows')).toBe(true);
    expect(isPlatform('linux')).toBe(true);
    expect(isPlatform('macos')).toBe(true);
    expect(isPlatform('freebsd')).toBe(false);
    expect(isPlatform(undefined)).toBe(false);
    expect(parsePlatform('macos')).toBe('macos');
    expect(parsePlatform('Windows')).toBeNull();
  });
});

describe('result and AppError', () => {
  it('wraps values and errors', async () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x')).toEqual({ ok: false, error: 'x' });
    expect(await toResult(Promise.resolve(2))).toEqual({ ok: true, value: 2 });
    const failed = await toResult(Promise.reject(new Error('boom')));
    expect(failed.ok).toBe(false);
    expect(!failed.ok && failed.error).toBeInstanceOf(AppError);
  });

  it('converts unknown errors', () => {
    const original = new AppError('http', 'bad', { status: 400, body: { error: 'bad' } });
    expect(AppError.from(original)).toBe(original);
    expect(original.status).toBe(400);
    expect(AppError.from(new Error('x'))).toMatchObject({ kind: 'unknown', message: 'x' });
    expect(AppError.from('text')).toMatchObject({ kind: 'unknown', message: 'text' });
    expect(new AppError('network', 'n', { cause: 'c' }).cause).toBe('c');
  });
});

describe('ids and list helpers', () => {
  it('builds field ids', () => {
    expect(fieldId('prep', 'cmd', 2)).toBe('prep-cmd-2');
    expect(fieldId('a b', null, undefined, '', 0)).toBe('a-b-0');
  });

  it('inserts, removes and replaces without mutating', () => {
    const list = ['a', 'b'];
    expect(insertAt(list, 1, 'x')).toEqual(['a', 'x', 'b']);
    expect(insertAt(list, -1, 'x')).toEqual(['a', 'b', 'x']);
    expect(insertAt(list, 9, 'x')).toEqual(['a', 'b', 'x']);
    expect(removeAt(list, 0)).toEqual(['b']);
    expect(removeAt(list, 5)).toEqual(['a', 'b']);
    expect(replaceAt(list, 1, 'y')).toEqual(['a', 'y']);
    expect(replaceAt(list, -1, 'y')).toEqual(['a', 'b']);
    expect(list).toEqual(['a', 'b']);
  });
});
