// @vitest-environment node
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SLICE_A = 'zz-arch-a';
const SLICE_B = 'zz-arch-b';
const sliceDirs = [SLICE_A, SLICE_B].map((slice) => resolve(appDir, 'src/features', slice));

// Two throw-away slices so cross-slice imports resolve to real files.
function writeSlice(slice: string) {
  const root = resolve(appDir, 'src/features', slice);
  for (const layer of ['domain', 'application', 'infrastructure', 'ui']) {
    mkdirSync(resolve(root, layer), { recursive: true });
    writeFileSync(resolve(root, layer, 'thing.ts'), 'export const thing = 1;\n');
  }
  writeFileSync(resolve(root, 'index.ts'), "export { thing } from './domain/thing';\n");
}

let eslint: ESLint;

beforeAll(() => {
  sliceDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  writeSlice(SLICE_A);
  writeSlice(SLICE_B);
  eslint = new ESLint({ cwd: appDir });
});

afterAll(() => {
  sliceDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

async function lint(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(appDir, file) });
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message);
}

describe('architecture lint rules', () => {
  it('lets domain code import the kernel', async () => {
    expect(
      await lint(
        `src/features/${SLICE_A}/domain/rule.ts`,
        "import { ok } from '@/shared/kernel';\nexport const r = ok(1);\n",
      ),
    ).toEqual([]);
  });

  it('keeps React out of the domain', async () => {
    expect(await lint(`src/features/${SLICE_A}/domain/rule.ts`, "import 'react';\n")).toContain(
      'no-restricted-imports',
    );
  });

  it('keeps shared ui out of the domain', async () => {
    expect(
      await lint(`src/features/${SLICE_A}/domain/rule.ts`, "import { notify } from '@/shared/ui';\nvoid notify;\n"),
    ).toContain('boundaries/dependencies');
  });

  it('forbids ui from importing infrastructure', async () => {
    const code = `import { thing } from '@/features/${SLICE_A}/infrastructure/thing';\nvoid thing;\n`;
    expect(await lint(`src/features/${SLICE_A}/ui/View.ts`, code)).toContain('boundaries/dependencies');
  });

  it('forbids fetch in the ui layer', async () => {
    expect(await lint(`src/features/${SLICE_A}/ui/View.ts`, "void fetch('./api/config');\n")).toContain(
      'no-restricted-globals',
    );
  });

  it('allows another slice only through its index.ts', async () => {
    const deep = `import { thing } from '@/features/${SLICE_B}/ui/thing';\nvoid thing;\n`;
    const entry = `import { thing } from '@/features/${SLICE_B}';\nvoid thing;\n`;
    expect(await lint(`src/features/${SLICE_A}/ui/View.ts`, deep)).toContain('boundaries/dependencies');
    expect(await lint(`src/features/${SLICE_A}/ui/View.ts`, entry)).toEqual([]);
  });

  it('forbids shared code from importing features', async () => {
    const code = `import { thing } from '@/features/${SLICE_A}';\nvoid thing;\n`;
    expect(await lint('src/shared/ui/Thing.ts', code)).toContain('boundaries/dependencies');
  });

  it('lets pages import only app and slice entries', async () => {
    expect(await lint('src/pages/demo.ts', "import { notify } from '@/shared/ui';\nvoid notify;\n")).toContain(
      'boundaries/dependencies',
    );
    expect(await lint('src/pages/demo.ts', "import { createPage } from '@/app';\nvoid createPage;\n")).toEqual([]);
  });

  it('lets application use the shared server-config hook but not the http client', async () => {
    const file = `src/features/${SLICE_A}/application/useThing.ts`;
    expect(
      await lint(
        file,
        "import { useServerConfig } from '@/shared/infrastructure/server-config';\nvoid useServerConfig;\n",
      ),
    ).toEqual([]);
    expect(
      await lint(file, "import { httpClient } from '@/shared/infrastructure/http';\nvoid httpClient;\n"),
    ).toContain('boundaries/dependencies');
  });

  it('requires the @ alias for imports across folders', async () => {
    expect(
      await lint(`src/features/${SLICE_A}/ui/View.ts`, "import { thing } from '../domain/thing';\nvoid thing;\n"),
    ).toContain('no-restricted-imports');
  });
});
