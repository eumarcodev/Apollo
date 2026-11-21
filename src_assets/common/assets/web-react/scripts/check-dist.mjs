// Post-build check: the output must be servable by the Helios web server (src/confighttp.cpp).
// Fails the build when an entry, a locale or an image is missing, or when a file type is not whitelisted.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBuildPaths } from '../vite-plugins/build-paths.js';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const { root, outDir } = resolveBuildPaths(process.env, appDir);

const PAGES = ['index', 'pin', 'apps', 'config', 'password', 'welcome', 'login', 'troubleshooting'];
// Extensions the server serves under /assets (mime_types in src/confighttp.h), plus the page HTML files.
const ALLOWED = new Set(['.js', '.css', '.json', '.svg', '.png', '.ico', '.woff2', '.ttf', '.html']);
const LOCALES = ['en.json', 'pt_BR.json'];

const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(outDir)) {
  console.error(`check-dist: output directory not found: ${outDir}`);
  process.exit(1);
}

for (const page of PAGES) {
  const file = join(outDir, `${page}.html`);
  if (!existsSync(file)) {
    errors.push(`missing ${page}.html`);
  } else if (!readFileSync(file, 'utf8').includes('name="helios-web-ui" content="react"')) {
    errors.push(`${page}.html has no helios-web-ui meta`);
  }
}

for (const file of walk(outDir)) {
  const rel = relative(outDir, file).split(sep).join('/');
  const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED.has(ext)) {
    errors.push(`file type not served by Helios: ${rel}`);
  }
  if (ext === '.html' && rel.includes('/')) {
    errors.push(`HTML outside the root: ${rel}`);
  }
}

const localeDir = join(outDir, 'assets', 'locale');
const locales = existsSync(localeDir) ? readdirSync(localeDir).sort() : [];
if (locales.join(',') !== LOCALES.join(',')) {
  errors.push(`assets/locale must hold exactly ${LOCALES.join(', ')}; found: ${locales.join(', ') || 'nothing'}`);
}

// Tray icons and logos are read by name from <assets>/web/images: they must be the source files, byte for byte.
const imagesSrc = resolve(root, 'public', 'images');
const imagesOut = join(outDir, 'images');
for (const name of readdirSync(imagesSrc)) {
  const out = join(imagesOut, name);
  if (!existsSync(out)) {
    errors.push(`missing images/${name}`);
  } else if (!readFileSync(out).equals(readFileSync(join(imagesSrc, name)))) {
    errors.push(`images/${name} differs from the source`);
  }
}

if (errors.length > 0) {
  console.error(`check-dist: ${errors.length} problem(s) in ${outDir}`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}
console.log(
  `check-dist: OK (${PAGES.length} pages, ${locales.length} locales, ${readdirSync(imagesSrc).length} images) in ${outDir}`,
);
