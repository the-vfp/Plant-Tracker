// Generates the app icon set: SVGs plus PNG rasters for platforms that don't
// take SVG (iOS home screen most of all — apple-touch-icon and manifest icons
// must be PNG there). The sprout is drawn with plain vector paths instead of
// an emoji <text> node so it renders identically everywhere; colors come from
// the Cozy Plants palette in src/styles/global.css (--leaf, --leaf-ink, --paper).
//
// Usage: node scripts/render-icons.mjs

import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const LEAF = '#79C25B';
const INK = '#1F3326';
const PAPER = '#FBF3E4';

const sprout = `
  <g fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M96 154 C 96 128 96 110 96 90"/>
    <path d="M96 92 C 97 66 114 50 141 48 C 143 76 124 93 96 92 Z" fill="${PAPER}"/>
    <path d="M96 122 C 95 98 79 83 53 81 C 51 108 69 123 96 122 Z" fill="${PAPER}"/>
    <path d="M104 84 C 112 72 122 62 132 56" stroke-width="6"/>
    <path d="M88 114 C 80 103 70 93 61 88" stroke-width="6"/>
  </g>`;

const svg = (size, { maskable }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 192 192">
  <rect width="192" height="192" ${maskable ? '' : 'rx="42"'} fill="${LEAF}"/>
  ${maskable ? `<g transform="translate(19.2 19.2) scale(0.8)">${sprout}</g>` : sprout}
</svg>
`;

const out = (name) => new URL(`../public/${name}`, import.meta.url);

const jobs = [
  // SVG sources (Android/desktop render these directly).
  ['icon-192.svg', svg(192, { maskable: false })],
  ['icon-512.svg', svg(512, { maskable: false })],
  ['icon-maskable-192.svg', svg(192, { maskable: true })],
  ['icon-maskable-512.svg', svg(512, { maskable: true })],
];
for (const [name, content] of jobs) {
  await writeFile(out(name), content);
}

// PNG rasters. apple-touch-icon is full-bleed (iOS applies its own corner
// mask), so it uses the maskable art.
const pngs = [
  ['icon-192.png', svg(192, { maskable: false }), 192],
  ['icon-512.png', svg(512, { maskable: false }), 512],
  ['icon-maskable-192.png', svg(192, { maskable: true }), 192],
  ['icon-maskable-512.png', svg(512, { maskable: true }), 512],
  ['apple-touch-icon.png', svg(180, { maskable: true }), 180],
];
for (const [name, source, size] of pngs) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(out(name).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
  console.log(`wrote public/${name}`);
}
