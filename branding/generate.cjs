// Generates the Helios (sun) and Selene (moon) icon family as SVG.
// Usage: node branding/generate.cjs [outDir]   (default: branding/svg)
// Rasters (PNG/ICO/ICNS) for both repositories come from branding/export.py.
'use strict';
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || path.join(__dirname, 'svg');
fs.mkdirSync(out, { recursive: true });

const f = (n) => Number(n.toFixed(1)).toString();
const oct = (cx, cy, r) => {
  const p = [];
  for (let k = 0; k < 8; k++) {
    const a = ((22.5 + 45 * k) * Math.PI) / 180;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return p;
};
const pts = (p) => p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const polyD = (p) => 'M ' + p.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ') + ' Z';

// Palette
const C = {
  obsidian: '#0A0B0F',
  gold: '#F5B82E', orange: '#FF6B1A', amber: '#FFC861', ruby: '#E0263B',
  silver: '#D9DEE8', cyan: '#5CE1FF', sapphire: '#2F5BFF', amethyst: '#8B5CF6',
};

const defs = `<defs>
  <radialGradient id="hBg" cx="50%" cy="50%" r="72%">
    <stop offset="0" stop-color="#3A1A06"/><stop offset=".5" stop-color="#160E09"/><stop offset="1" stop-color="${C.obsidian}"/>
  </radialGradient>
  <radialGradient id="sBg" cx="50%" cy="50%" r="72%">
    <stop offset="0" stop-color="#0B2346"/><stop offset=".5" stop-color="#0C111D"/><stop offset="1" stop-color="${C.obsidian}"/>
  </radialGradient>
  <radialGradient id="lBg" cx="50%" cy="45%" r="75%">
    <stop offset="0" stop-color="#16131A"/><stop offset="1" stop-color="${C.obsidian}"/>
  </radialGradient>
  <radialGradient id="hGlow"><stop offset="0" stop-color="${C.orange}" stop-opacity=".55"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
  <radialGradient id="sGlow"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".45"/><stop offset="1" stop-color="${C.sapphire}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFEBB0"/><stop offset=".35" stop-color="${C.gold}"/><stop offset=".7" stop-color="#A9650F"/><stop offset="1" stop-color="#FFD46B"/>
  </linearGradient>
  <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="${C.silver}"/><stop offset=".7" stop-color="#7C879C"/><stop offset="1" stop-color="#EEF2FA"/>
  </linearGradient>
  <linearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="${C.silver}"/><stop offset="1" stop-color="#8E99B0"/>
  </linearGradient>
  <radialGradient id="ruby" cx="40%" cy="36%" r="70%">
    <stop offset="0" stop-color="#FFC27A"/><stop offset=".3" stop-color="${C.orange}"/><stop offset=".68" stop-color="${C.ruby}"/><stop offset="1" stop-color="#5E0818"/>
  </radialGradient>
  <radialGradient id="sapphire" cx="40%" cy="36%" r="70%">
    <stop offset="0" stop-color="#C8F6FF"/><stop offset=".3" stop-color="${C.cyan}"/><stop offset=".68" stop-color="${C.sapphire}"/><stop offset="1" stop-color="#121A5A"/>
  </radialGradient>
  <linearGradient id="emit" gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="985" y2="0">
    <stop offset="0" stop-color="${C.amber}"/><stop offset=".45" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="recv" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="320" y2="0">
    <stop offset="0" stop-color="${C.orange}" stop-opacity="0"/><stop offset=".3" stop-color="${C.orange}" stop-opacity=".85"/><stop offset=".7" stop-color="${C.cyan}"/><stop offset="1" stop-color="#C8F6FF"/>
  </linearGradient>
  <linearGradient id="bridge" gradientUnits="userSpaceOnUse" x1="680" y1="0" x2="1340" y2="0">
    <stop offset="0" stop-color="${C.amber}"/><stop offset=".3" stop-color="${C.orange}"/><stop offset=".7" stop-color="${C.cyan}"/><stop offset="1" stop-color="#C8F6FF"/>
  </linearGradient>
  <filter id="glow" filterUnits="userSpaceOnUse" x="-1024" y="-1024" width="4096" height="3072">
    <feGaussianBlur stdDeviation="10" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <clipPath id="emblemClip"><circle cx="512" cy="512" r="342"/></clipPath>
  <clipPath id="roundTile"><rect width="1024" height="1024" rx="230"/></clipPath>
</defs>`;

// ---------- building blocks (emblem coordinates: centered on 512,512) ----------
function gem(cx, cy, r, fill, bezel, facet) {
  const o = oct(cx, cy, r), b = oct(cx, cy, r * 1.13), t = oct(cx, cy, r * 0.52);
  let s = `<polygon points="${pts(b)}" fill="url(#${bezel})" stroke="#000" stroke-opacity=".5" stroke-width="3"/>`;
  s += `<polygon points="${pts(o)}" fill="url(#${fill})"/>`;
  s += o.map((v, i) => `<line x1="${f(v[0])}" y1="${f(v[1])}" x2="${f(t[i][0])}" y2="${f(t[i][1])}" stroke="${facet}" stroke-opacity=".45" stroke-width="2.5"/>`).join('');
  s += `<polygon points="${pts(t)}" fill="${facet}" fill-opacity=".16" stroke="${facet}" stroke-opacity=".65" stroke-width="2.5"/>`;
  const hx = cx - r * 0.3, hy = cy - r * 0.42;
  s += `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(r * 0.3)}" ry="${f(r * 0.1)}" transform="rotate(-30 ${f(hx)} ${f(hy)})" fill="#fff" fill-opacity=".5"/>`;
  return s;
}
const studPts = (x, y) => [[x, y - 20], [x + 14, y], [x, y + 20], [x - 14, y]];
const stud = (x, y, fill, metal) =>
  `<polygon points="${pts(studPts(x, y))}" fill="${fill}" stroke="url(#${metal})" stroke-width="4"/>`;
const ring = (metal, accent) =>
  `<circle cx="512" cy="512" r="318" fill="none" stroke="url(#${metal})" stroke-width="20"/>` +
  `<circle cx="512" cy="512" r="296" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="3"/>`;
const waveD = (x, y, seg, n, amp) => {
  let d = `M ${f(x)} ${f(y)} q ${f(seg / 2)} ${-amp} ${f(seg)} 0`;
  for (let i = 1; i < n; i++) d += ` t ${f(seg)} 0`;
  return d;
};
// [x, y, segment, count, amplitude, width]
const H_WAVES = [[640, 452, 72, 4, 22, 12], [640, 512, 80, 4, 26, 16], [640, 572, 72, 4, 22, 12]];
const S_WAVES = [[70, 452, 58, 4, 20, 12], [50, 512, 64, 4, 24, 16], [70, 572, 58, 4, 20, 12]];
const waves = (list, stroke) =>
  `<g filter="url(#glow)" stroke="url(#${stroke})" stroke-linecap="round" fill="none">` +
  list.map(([x, y, s, n, a, w]) => `<path d="${waveD(x, y, s, n, a)}" stroke-width="${w}"/>`).join('') + `</g>`;

const H_STUDS = [[512, 194], [512, 830], [194, 512]];
const S_STUDS = [[512, 194], [512, 830], [830, 512]];
const H_GEM = [512, 512, 150];
const S_GEM = [430, 512, 120];

function helios({ withWaves = true, glow = true } = {}) {
  let s = glow ? `<circle cx="512" cy="512" r="330" fill="url(#hGlow)"/>` : '';
  for (let i = 0; i <= 8; i++) {
    const long = i % 2 === 0, tip = long ? 218 : 262, hw = long ? 20 : 14;
    s += `<polygon points="512,${tip} ${512 + hw},346 ${512 - hw},346" fill="url(#gold)" transform="rotate(${-22.5 * i} 512 512)"/>`;
  }
  s += ring('gold', C.gold);
  if (withWaves) s += waves(H_WAVES, 'emit');
  s += H_STUDS.map(([x, y]) => stud(x, y, C.amber, 'gold')).join('');
  s += gem(...H_GEM, 'ruby', 'gold', '#FFE0B8');
  return s;
}

// Crescent open to the left: outer circle (512,512) r250, cut circle (420,512) r215.
const CRESCENT = 'M 377.6 301.2 A 250 250 0 1 1 377.6 722.8 A 215 215 0 1 0 377.6 301.2 Z';
function selene({ withWaves = true, glow = true } = {}) {
  let s = glow ? `<circle cx="512" cy="512" r="330" fill="url(#sGlow)"/>` : '';
  s += ring('silver', C.silver);
  s += `<path d="${CRESCENT}" fill="url(#moon)" stroke="#5B6478" stroke-width="3"/>`;
  s += `<path d="M 377.6 722.8 A 215 215 0 1 0 377.6 301.2" fill="none" stroke="${C.cyan}" stroke-width="6" filter="url(#glow)" stroke-opacity=".9"/>`;
  if (withWaves) s += waves(S_WAVES, 'recv');
  s += S_STUDS.map(([x, y]) => stud(x, y, C.amethyst, 'silver')).join('');
  s += gem(...S_GEM, 'sapphire', 'silver', '#E6FBFF');
  return s;
}

// Tray state glyphs, drawn over the Helios gem.
const GLYPHS = {
  playing: `<polygon points="470,422 470,602 618,512" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10" stroke-linejoin="round"/>`,
  pausing: `<rect x="440" y="424" width="52" height="176" rx="10" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>` +
    `<rect x="532" y="424" width="52" height="176" rx="10" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>`,
  locked: `<path d="M 462 500 V 462 a 50 50 0 0 1 100 0 V 500" fill="none" stroke="#fff" stroke-width="26"/>` +
    `<rect x="426" y="494" width="172" height="128" rx="18" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>` +
    `<circle cx="512" cy="550" r="16" fill="#1A0A05" fill-opacity=".7"/>`,
};

// ---------- monochrome silhouette (Android themed icon, notification icon, TV channel) ----------
function seleneMonoShapes() {
  // Returns [{d, fill|stroke, width, evenOdd}] in emblem coordinates.
  const ringD = 'M 512 184 A 328 328 0 1 1 511.9 184 Z M 512 206 A 306 306 0 1 0 512.1 206 Z';
  const gemOuter = oct(...S_GEM.slice(0, 2), S_GEM[2] * 1.13);
  const gemInner = oct(...S_GEM.slice(0, 2), S_GEM[2] * 0.82);
  const gemTable = oct(...S_GEM.slice(0, 2), S_GEM[2] * 0.45);
  const shapes = [
    { d: ringD, fill: true, evenOdd: true },
    { d: CRESCENT, fill: true },
    { d: polyD(gemOuter) + ' ' + polyD(gemInner), fill: true, evenOdd: true },
    { d: polyD(gemTable), fill: true },
    ...S_STUDS.map(([x, y]) => ({ d: polyD(studPts(x, y)), fill: true })),
    ...S_WAVES.map(([x, y, s, n, a, w]) => ({ d: waveD(x, y, s, n, a), stroke: true, width: w + 6 })),
  ];
  return shapes;
}
const monoSvg = (shapes, color = '#fff') =>
  shapes.map((p) => p.stroke
    ? `<path d="${p.d}" fill="none" stroke="${color}" stroke-width="${p.width}" stroke-linecap="round"/>`
    : `<path d="${p.d}" fill="${color}"${p.evenOdd ? ' fill-rule="evenodd"' : ''}/>`).join('');

// ---------- layouts ----------
const fit = (inner, s) => `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">${inner}</g>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}${body}</svg>\n`;
const write = (name, content) => fs.writeFileSync(path.join(out, name), content);

const EMBLEM = { helios, selene };
const BG = { helios: 'hBg', selene: 'sBg' };
for (const name of ['helios', 'selene']) {
  const E = EMBLEM[name], bg = BG[name];
  // Full-bleed square app icon (Android adaptive preview, Play Store, README).
  write(`${name}-icon.svg`, svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#${bg})"/>${fit(E(), 0.92)}`));
  // Rounded tile (Windows icon, legacy Android launcher).
  write(`${name}-icon-rounded.svg`, svg(1024, 1024,
    `<g clip-path="url(#roundTile)"><rect width="1024" height="1024" fill="url(#${bg})"/>${fit(E(), 1.0)}</g>`));
  // Mark: emblem on its own dark disc, no square, for 16 to 45 px (tray, favicon, web navbar).
  const mark = (extra = '') => svg(1024, 1024, fit(
    `<circle cx="512" cy="512" r="318" fill="url(#${bg})"/><g clip-path="url(#emblemClip)">${E({ glow: true })}</g>${extra}`, 1.48));
  write(`${name}-mark.svg`, mark());
  // Adaptive icon layers (108dp canvas, emblem inside the 66dp safe zone).
  write(`${name}-foreground.svg`, svg(1024, 1024, fit(E(), 0.92)));
  write(`${name}-background.svg`, svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#${bg})"/>`));
}
// Helios tray states.
for (const [state, glyph] of Object.entries(GLYPHS)) {
  write(`helios-mark-${state}.svg`, svg(1024, 1024, fit(
    `<circle cx="512" cy="512" r="318" fill="url(#hBg)"/><g clip-path="url(#emblemClip)">${helios()}</g>` +
    `<polygon points="${pts(oct(512, 512, 150))}" fill="#0A0B0F" fill-opacity=".45"/>${glyph}`, 1.48)));
}
// Selene monochrome: adaptive layer size and a filled small-icon size.
write('selene-monochrome.svg', svg(1024, 1024, fit(monoSvg(seleneMonoShapes()), 0.92)));
write('selene-monochrome-small.svg', svg(1024, 1024, fit(monoSvg(seleneMonoShapes()), 1.42)));

// Android vector drawable of the monochrome mark (TV channel logo).
{
  const items = seleneMonoShapes().map((p) => p.stroke
    ? `    <path android:pathData="${p.d}" android:strokeColor="#FFFFFF" android:strokeWidth="${p.width}" android:strokeLineCap="round"/>`
    : `    <path android:pathData="${p.d}" android:fillColor="#FFFFFF"${p.evenOdd ? ' android:fillType="evenOdd"' : ''}/>`).join('\n');
  write('selene-monochrome.xml',
    `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by Helios-Server/branding/generate.cjs -->\n` +
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="24dp" android:height="24dp"\n` +
    `    android:viewportWidth="1024" android:viewportHeight="1024">\n  <group android:pivotX="512" android:pivotY="512" android:scaleX="1.42" android:scaleY="1.42">\n` +
    items.replace(/^/gm, '  ') + `\n  </group>\n</vector>\n`);
}

// Banner (Android TV / OUYA): emblem on the left, wordmark on the right.
function banner(w, h) {
  const r = h * 0.36, cx = h * 0.46, s = r / 340;
  const tx = cx + r + h * 0.12, tw = w - tx - h * 0.12;
  return svg(w, h,
    `<rect width="${w}" height="${h}" fill="url(#lBg)"/>` +
    `<g transform="translate(${f(cx - 512 * s)} ${f(h / 2 - 512 * s)}) scale(${f(s * 1000) / 1000})">${selene()}</g>` +
    `<text x="${f(tx)}" y="${f(h * 0.53)}" textLength="${f(tw)}" lengthAdjust="spacingAndGlyphs" font-family="Cinzel, 'Trajan Pro', Georgia, serif" font-size="${f(h * 0.2)}" fill="url(#silver)">SELENE</text>` +
    `<text x="${f(tx)}" y="${f(h * 0.7)}" textLength="${f(tw)}" lengthAdjust="spacing" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="${f(h * 0.075)}" fill="${C.cyan}">GAME STREAMING</text>`);
}
write('selene-banner-tv.svg', banner(320, 180));
write('selene-banner-ouya.svg', banner(732, 412));

// Lockup: both emblems joined by one wave, names below.
{
  const sc = 0.8, hx = 140, sx = 2048 - 140 - 1024 * sc, ty = 40, cy = 512 * sc + ty;
  const bridge = `<g filter="url(#glow)" stroke="url(#bridge)" stroke-linecap="round" fill="none">` +
    `<path d="${waveD(700, cy - 48, 61, 10, 18)}" stroke-width="10"/>` +
    `<path d="${waveD(680, cy, 64.5, 10, 22)}" stroke-width="14"/>` +
    `<path d="${waveD(700, cy + 48, 61, 10, 18)}" stroke-width="10"/></g>`;
  const word = (x, text, fill) =>
    `<text x="${f(x)}" y="935" text-anchor="middle" font-family="Cinzel, 'Trajan Pro', Georgia, serif" font-size="92" letter-spacing="20" fill="url(#${fill})">${text}</text>`;
  write('helios-selene-lockup.svg', svg(2048, 1024,
    `<rect width="2048" height="1024" fill="url(#lBg)"/>` +
    `<g transform="translate(${hx} ${ty}) scale(${sc})">${helios({ withWaves: false })}</g>` +
    `<g transform="translate(${f(sx)} ${ty}) scale(${sc})">${selene({ withWaves: false })}</g>` + bridge +
    word(hx + 512 * sc, 'HELIOS', 'gold') + word(sx + 512 * sc, 'SELENE', 'silver')));
}
console.log(`SVGs written to ${out}`);
