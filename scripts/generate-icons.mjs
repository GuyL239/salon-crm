/**
 * generate-icons.mjs
 * Run once to produce PNG icons for PWA installability and iOS apple-touch-icon.
 *
 *   npm install --save-dev sharp   (one-time, sharp is a dev dependency)
 *   node scripts/generate-icons.mjs
 *
 * What this produces:
 *   public/icons/icon-192.png     — Android PWA home-screen icon
 *   public/icons/icon-512.png     — Android PWA splash / store listing
 *   public/icons/apple-icon.png   — iOS Safari "Add to Home Screen" (180×180)
 *
 * The SVG source is public/icons/icon.svg — edit that file to change the logo.
 * Re-run this script after any SVG change.
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");
const svgPath   = join(root, "public", "icons", "icon.svg");
const outDir    = join(root, "public", "icons");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const targets = [
  { file: "icon-192.png",   size: 192 },
  { file: "icon-512.png",   size: 512 },
  { file: "apple-icon.png", size: 180 },  // iOS requires exactly 180×180
];

for (const { file, size } of targets) {
  await sharp(svg)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(outDir, file));

  console.log(`✓  public/icons/${file}  (${size}×${size})`);
}

console.log("\nDone. Commit the generated PNGs to version control.");
