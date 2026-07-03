// One-off maintenance script: recompress the full-size demo photos in
// public/demo-data.json so first-time visitors aren't downloading a ~7.8MB
// seed file. Demo photos only need to look good in the app's photo grid and
// lightbox, so they can sit well below the in-app capture pipeline's
// 1200px/0.8 ceiling (see src/utils/imageCompression.js).
//
// Usage: node scripts/slim-demo-photos.mjs
// Rewrites public/demo-data.json in place and prints before/after sizes.

import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const FILE = new URL('../public/demo-data.json', import.meta.url);
const MAX_DIMENSION = 800;
const QUALITY = 60;

const dataUrlToBuffer = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');
const bufferToDataUrl = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;

const raw = await readFile(FILE, 'utf8');
const data = JSON.parse(raw);

let before = 0;
let after = 0;

for (const photo of data.photos ?? []) {
  const input = dataUrlToBuffer(photo.blob);
  before += input.length;
  const output = await sharp(input)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toBuffer();
  // Keep whichever is smaller — a photo already below the target shouldn't grow.
  const winner = output.length < input.length ? output : input;
  after += winner.length;
  photo.blob = bufferToDataUrl(winner);
}

await writeFile(FILE, JSON.stringify(data));

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)}MB`;
console.log(`photos: ${(data.photos ?? []).length}`);
console.log(`full-size blobs: ${mb(before)} -> ${mb(after)}`);
