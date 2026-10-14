// Prepara el material del client (assets-src) per al web. Es llança amb `pnpm images` i el resultat
// (public/images, public/brand, src/app/icon.png…) es puja al repositori.
//
//  · Les fotos passen a WebP a quatre amplades, sense ampliar-les mai per damunt de l'original.
//  · El logotip original és per a fons clar. Per a fons fosc se'n fa una versió: el nom en blanc i
//    el símbol QE amb un contorn blanc al voltant, com fa Quality Estates al seu web.
//  · La icona surt del símbol QE; la imatge per a xarxes, de la foto de la vila amb el logotip.

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets-src";
// Les mateixes amplades que `src/lib/image-loader.ts`: la pàgina tria la més petita que li fa falta.
const WIDTHS = [640, 1080, 1600, 2400];

await mkdir("public/images", { recursive: true });
await mkdir("public/brand", { recursive: true });

/** Desa una foto a totes les amplades. */
async function variants(input, base, options = { quality: 78 }) {
  const sizes = [];
  for (const width of WIDTHS) {
    const result = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp(options).toFile(`public/images/${base}-${width}.webp`);
    sizes.push(`${width}:${Math.round(result.size / 1024)}kB`);
  }
  console.log(`${base.padEnd(26)} ${sizes.join("  ")}`);
}

// Fotos del web actual (quality-constructions.com) i de la pàgina d'obres del web del grup.
const photos = [
  ["photos/vila-piscina.jpg", "vila-piscina"],
  ["photos/cuina-illa.jpg", "cuina-illa"],
  ["photos/terrassa-cuina-exterior.jpg", "terrassa-cuina-exterior"],
  ["photos/bany-microciment.jpg", "bany-microciment"],
  ["photos/equip-showroom.jpg", "equip-showroom"],
  ["photos/obra-coberta.webp", "obra-coberta"],
  ["photos/terrassa-pergola.webp", "terrassa-pergola"],
];
for (const [file, base] of photos) await variants(`${SRC}/${file}`, base);

// --- Logotip -------------------------------------------------------------------------------------

const LOGO = `${SRC}/brand/logo-arenda.png`;
// On acaba el símbol QE i comença la ratlla vertical i el nom (en píxels de l'original, 646 × 291).
const MARK_END = 318;

await sharp(LOGO).png({ compressionLevel: 9 }).toFile("public/brand/logo-arenda.png");

{
  const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // 1. El nom i la ratlla, en blanc.
  const light = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = MARK_END; x < width; x++) {
      const i = (y * width + x) * 4;
      light[i] = light[i + 1] = light[i + 2] = 255;
    }
  }
  // 2. Un contorn blanc darrere del símbol: la seva silueta engruixida uns quants píxels.
  const alpha = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < MARK_END; x++) alpha[y * width + x] = data[(y * width + x) * 4 + 3];
  }
  // `toColourspace("b-w")`: sense això sharp torna tres canals i la màscara surt a ratlles.
  const halo = await sharp(alpha, { raw: { width, height, channels: 1 } }).blur(2.4).threshold(8).toColourspace("b-w").raw().toBuffer();
  const haloRgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++) haloRgba[i * 4 + 3] = halo[i];
  await sharp(haloRgba, { raw: { width, height, channels: 4 } })
    .composite([{ input: light, raw: { width, height, channels: 4 } }])
    .png({ compressionLevel: 9 })
    .toFile("public/brand/logo-arenda-on-dark.png");
  console.log("logo-arenda-on-dark.png");
}

// Símbol sol (per a la capçalera estreta de mòbil i per a la icona).
await sharp(`${SRC}/brand/logo-qe-icon.png`).resize({ width: 240 }).png({ compressionLevel: 9 }).toFile("public/brand/qe-symbol.png");

// Icona del lloc: el símbol sobre blanc, amb marge, quadrat.
const square = async (size, pad) =>
  sharp(`${SRC}/brand/logo-qe-icon.png`)
    .resize({ width: size - pad * 2, height: size - pad * 2, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" });
await (await square(512, 40)).png().toFile("src/app/icon.png");
await (await square(180, 16)).png().toFile("src/app/apple-icon.png");
console.log("icon.png, apple-icon.png");

// Faldó del Kit Digital: obligatori en els webs finançats pel programa.
await sharp(`${SRC}/brand/kit-digital-faldon.png`).resize({ width: 900 }).png({ compressionLevel: 9 }).toFile("public/brand/kit-digital.png");

// --- Imatge per a xarxes (1200 × 630) ------------------------------------------------------------

{
  const logo = await sharp("public/brand/logo-arenda.png").resize({ width: 330 }).toBuffer();
  const plate = await sharp({ create: { width: 390, height: 196, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.94 } } })
    .composite([{ input: logo, left: 30, top: 24 }])
    .png()
    .toBuffer();
  await sharp(`${SRC}/photos/vila-piscina.jpg`)
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .composite([{ input: plate, left: 48, top: 48 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile("public/og.jpg");
  console.log("og.jpg");
}
