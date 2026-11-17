// Generates the Helios (sun) icons as SVG.
// Usage: node branding/generate.cjs [outDir]   (default: branding/svg)
// Rasters (PNG/ICO/ICNS) come from branding/export.py.
// The matching Selene (moon) icons are generated in Selene-Game-Streaming/branding.
'use strict';
const fs = require('fs');
const path = require('path');
const { C, oct, pts, gem, stud, ring, waves, fit, svg } = require('./icon-core.cjs');

const out = process.argv[2] || path.join(__dirname, 'svg');
fs.mkdirSync(out, { recursive: true });
const write = (name, content) => fs.writeFileSync(path.join(out, name), content);

const defs = `
  <radialGradient id="hBg" cx="50%" cy="50%" r="72%">
    <stop offset="0" stop-color="#3A1A06"/><stop offset=".5" stop-color="#160E09"/><stop offset="1" stop-color="${C.obsidian}"/>
  </radialGradient>
  <radialGradient id="hGlow"><stop offset="0" stop-color="${C.orange}" stop-opacity=".55"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFEBB0"/><stop offset=".35" stop-color="${C.gold}"/><stop offset=".7" stop-color="#A9650F"/><stop offset="1" stop-color="#FFD46B"/>
  </linearGradient>
  <radialGradient id="ruby" cx="40%" cy="36%" r="70%">
    <stop offset="0" stop-color="#FFC27A"/><stop offset=".3" stop-color="${C.orange}"/><stop offset=".68" stop-color="${C.ruby}"/><stop offset="1" stop-color="#5E0818"/>
  </radialGradient>
  <linearGradient id="emit" gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="985" y2="0">
    <stop offset="0" stop-color="${C.amber}"/><stop offset=".45" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/>
  </linearGradient>`;

// Rays on the left, waves leaving to the right: the host emits the stream.
const H_WAVES = [[640, 452, 72, 4, 22, 12], [640, 512, 80, 4, 26, 16], [640, 572, 72, 4, 22, 12]];
const H_STUDS = [[512, 194], [512, 830], [194, 512]];
function helios() {
  let s = `<circle cx="512" cy="512" r="330" fill="url(#hGlow)"/>`;
  for (let i = 0; i <= 8; i++) {
    const long = i % 2 === 0, tip = long ? 218 : 262, hw = long ? 20 : 14;
    s += `<polygon points="512,${tip} ${512 + hw},346 ${512 - hw},346" fill="url(#gold)" transform="rotate(${-22.5 * i} 512 512)"/>`;
  }
  s += ring('gold', C.gold);
  s += waves(H_WAVES, 'emit');
  s += H_STUDS.map(([x, y]) => stud(x, y, C.amber, 'gold')).join('');
  s += gem(512, 512, 150, 'ruby', 'gold', '#FFE0B8');
  return s;
}

// Tray state glyphs, drawn over the gem.
const GLYPHS = {
  playing: `<polygon points="470,422 470,602 618,512" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10" stroke-linejoin="round"/>`,
  pausing: `<rect x="440" y="424" width="52" height="176" rx="10" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>` +
    `<rect x="532" y="424" width="52" height="176" rx="10" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>`,
  locked: `<path d="M 462 500 V 462 a 50 50 0 0 1 100 0 V 500" fill="none" stroke="#fff" stroke-width="26"/>` +
    `<rect x="426" y="494" width="172" height="128" rx="18" fill="#fff" stroke="#1A0A05" stroke-opacity=".6" stroke-width="10"/>` +
    `<circle cx="512" cy="550" r="16" fill="#1A0A05" fill-opacity=".7"/>`,
};

const markBody = (extra = '') => fit(
  `<circle cx="512" cy="512" r="318" fill="url(#hBg)"/><g clip-path="url(#emblemClip)">${helios()}</g>${extra}`, 1.48);

// Full-bleed square (README, store-style previews).
write('helios-icon.svg', svg(defs, 1024, 1024, `<rect width="1024" height="1024" fill="url(#hBg)"/>${fit(helios(), 0.92)}`));
// Rounded tile (executable and installer icon from 40 px up).
write('helios-icon-rounded.svg', svg(defs, 1024, 1024,
  `<g clip-path="url(#roundTile)"><rect width="1024" height="1024" fill="url(#hBg)"/>${fit(helios(), 1.0)}</g>`));
// Mark: emblem on its own dark disc, for 16 to 45 px (tray, favicon, web navbar).
write('helios-mark.svg', svg(defs, 1024, 1024, markBody()));
for (const [state, glyph] of Object.entries(GLYPHS)) {
  write(`helios-mark-${state}.svg`, svg(defs, 1024, 1024,
    markBody(`<polygon points="${pts(oct(512, 512, 150))}" fill="${C.obsidian}" fill-opacity=".45"/>${glyph}`)));
}
console.log(`Helios SVGs written to ${out}`);
