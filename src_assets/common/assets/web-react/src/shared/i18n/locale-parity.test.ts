import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLocaleFile } from '@/shared/testing';
import { SUPPORTED_LOCALES } from './locale';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('locale files', () => {
  it('ship only en and pt_BR', () => {
    const files = readdirSync(resolve(__dirname, '../../../public/assets/locale')).sort();
    expect(files).toEqual(SUPPORTED_LOCALES.map((locale) => `${locale}.json`).sort());
  });

  it('have exactly the same keys in en and pt_BR', () => {
    const en = new Set(flattenKeys(readLocaleFile('en')));
    const pt = new Set(flattenKeys(readLocaleFile('pt_BR')));
    const missingInPt = [...en].filter((key) => !pt.has(key));
    const missingInEn = [...pt].filter((key) => !en.has(key));
    expect({ missingInPt, missingInEn }).toEqual({ missingInPt: [], missingInEn: [] });
  });

  it('have no empty messages', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const flat = flattenKeys(readLocaleFile(locale));
      expect(flat.length).toBeGreaterThan(600);
    }
  });
});
