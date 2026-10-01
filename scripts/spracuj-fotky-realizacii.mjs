// Pripraví fotky z nahraj-realizacie/ pre web: otočí podľa EXIF, zmenší na
// max. 2000 px, uloží ako JPEG a odstráni metadáta (aj GPS polohu).
//
// Použitie: node scripts/spracuj-fotky-realizacii.mjs <slug> <fotka1> [fotka2 ...]
// Výstup:   public/realizacie/<slug>/1.jpg, 2.jpg, ...
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const [slug, ...files] = process.argv.slice(2);
if (!slug || !files.length || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Použitie: node scripts/spracuj-fotky-realizacii.mjs <slug> <fotka1> [fotka2 ...]");
  process.exit(1);
}

// Výstup vždy do public/ v koreni repozitára, nech sa skript spustí odkiaľkoľvek.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "public", "realizacie", slug);
await fs.mkdir(outDir, { recursive: true });

let n = 0;
for (const file of files) {
  n += 1;
  const out = path.join(outDir, `${n}.jpg`);
  const info = await sharp(file)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log(`${file} → ${path.relative(repoRoot, out)} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} kB)`);
}
