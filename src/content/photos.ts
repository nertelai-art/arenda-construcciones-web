/**
 * Les fotos del client que fa servir la pàgina, amb la mida de l'original. Els fitxers surten de
 * `pnpm images` a quatre amplades. Les cinc primeres són del web actual (quality-constructions.com);
 * `obra-coberta` i `terrassa-pergola`, de les pàgines d'obres i de l'equip del web del grup.
 */
export const photos = {
  villaPool: { src: "/images/vila-piscina.webp", width: 2400, height: 1600 },
  kitchen: { src: "/images/cuina-illa.webp", width: 2400, height: 1600 },
  outdoorKitchen: { src: "/images/terrassa-cuina-exterior.webp", width: 2400, height: 1600 },
  bathroom: { src: "/images/bany-microciment.webp", width: 1920, height: 1440 },
  team: { src: "/images/equip-showroom.webp", width: 2400, height: 1800 },
  roofSite: { src: "/images/obra-coberta.webp", width: 1800, height: 1350 },
  pergola: { src: "/images/terrassa-pergola.webp", width: 1800, height: 1200 },
} as const;

export type PhotoKey = keyof typeof photos;
