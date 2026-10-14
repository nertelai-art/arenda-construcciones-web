// Coreografia de la vila (obra nova), sense three.js: la llegeixen l'escena (què es mou) i l'HTML
// (quin pas és actiu, quan es fa de dia o de nit). Tot és funció pura del progrés, de 0 a 1.

import { cameraBetween, easeInOut, segment, stepIndex, type CameraKey, type Range } from "@/lib/easing";

/** Els sis passos de l'esquerra. Es toquen sense forats. */
export const STEPS = [
  [0, 0.14], // el plànol i la llicència
  [0.14, 0.3], // fonaments
  [0.3, 0.45], // estructura
  [0.45, 0.68], // tancaments i instal·lacions: la casa s'obre en capes
  [0.68, 0.84], // coberta i fusteria
  [0.84, 1], // piscina i entrega
] as const satisfies readonly Range[];

/** Moviments concrets. Se solapen una mica perquè no hi hagi estones mortes. */
export const BEATS = {
  plan: [0.015, 0.12],
  ghostIn: [0.04, 0.13],
  ghostOut: [0.66, 0.8],
  paper: [0.12, 0.2],
  dig: [0.14, 0.22],
  slab: [0.17, 0.29],
  columns: [0.3, 0.4],
  deck: [0.36, 0.45],
  walls: [0.45, 0.54],
  explode: [0.53, 0.59],
  pipes: [0.555, 0.64],
  collapse: [0.635, 0.68],
  render: [0.68, 0.76],
  roof: [0.69, 0.78],
  stone: [0.7, 0.8],
  windows: [0.74, 0.83],
  water: [0.845, 0.92],
  terrace: [0.84, 0.94],
  garden: [0.87, 0.96],
  dusk: [0.92, 1],
} as const satisfies Record<string, Range>;

export const stepAt = (p: number) => stepIndex(p, STEPS);

/** 0 = casa tancada, 1 = oberta del tot. Puja a `explode` i torna a baixar a `collapse`. */
export const explodeAt = (p: number) => easeInOut(segment(p, BEATS.explode)) * (1 - easeInOut(segment(p, BEATS.collapse)));

/** 1 = el dibuix del plànol es veu del tot; s'esvaeix quan la casa ja és dreta. */
export const ghostAt = (p: number) => easeInOut(segment(p, BEATS.ghostIn)) * (1 - easeInOut(segment(p, BEATS.ghostOut)));

/** 0 = paper de plànol, 1 = terreny de debò. */
export const paperToGroundAt = (p: number) => easeInOut(segment(p, BEATS.paper));

/** 0 = migdia, 1 = capvespre amb els llums encesos. */
export const duskAt = (p: number) => easeInOut(segment(p, BEATS.dusk));

// [progrés, azimut, elevació, amplada que ha de cabre, alçada del punt de mira]
// L'elevació no baixa mai de 0,38 rad: amb 30° de camp vertical, l'horitzó queda fora de pla.
const CAMERA_KEYS: readonly CameraKey[] = [
  [0, 0.3, 1.12, 24, 0],
  [0.13, 0.38, 1.0, 23, 0.2],
  [0.3, 0.55, 0.66, 23, 0.8],
  [0.45, 0.62, 0.52, 22.5, 1.6],
  [0.57, 0.8, 0.8, 28, 3],
  [0.635, 0.84, 0.78, 28, 3],
  [0.72, 0.66, 0.5, 24, 2],
  [0.84, 0.46, 0.42, 24, 1.7],
  [1, 0.24, 0.38, 26, 1.5],
];

export const cameraAt = (p: number) => cameraBetween(CAMERA_KEYS, p);
