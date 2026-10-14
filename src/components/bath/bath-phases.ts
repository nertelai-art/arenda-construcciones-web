// Coreografia del bany (reforma), sense three.js: la llegeixen l'escena i l'HTML.

import { cameraBetween, easeInOut, segment, stepIndex, type CameraKey, type Range } from "@/lib/easing";

/** Els cinc passos de l'esquerra. Es toquen sense forats. */
export const STEPS = [
  [0, 0.16], // l'estat d'abans
  [0.16, 0.4], // enderroc
  [0.4, 0.6], // instal·lacions noves
  [0.6, 0.8], // revestiments
  [0.8, 1], // mobles i llum
] as const satisfies readonly Range[];

export const BEATS = {
  oldOut: [0.17, 0.3],
  tilesOff: [0.2, 0.38],
  pipes: [0.41, 0.58],
  floor: [0.6, 0.7],
  walls: [0.64, 0.76],
  mosaic: [0.68, 0.8],
  tub: [0.8, 0.88],
  vanity: [0.83, 0.91],
  basins: [0.87, 0.94],
  glass: [0.88, 0.95],
  mirror: [0.9, 0.97],
  glow: [0.93, 1],
} as const satisfies Record<string, Range>;

export const stepAt = (p: number) => stepIndex(p, STEPS);

/** 0 = llum de dia plana d'obra, 1 = mirall i focus encesos. */
export const glowAt = (p: number) => easeInOut(segment(p, BEATS.glow));

const CAMERA_KEYS: readonly CameraKey[] = [
  [0, 0.62, 0.42, 7.6, 1.15],
  [0.2, 0.58, 0.46, 7.8, 1.15],
  [0.4, 0.72, 0.52, 7.8, 1.1],
  [0.6, 0.6, 0.46, 7.6, 1.1],
  [0.8, 0.5, 0.38, 7.4, 1.15],
  [1, 0.42, 0.32, 7.2, 1.2],
];

export const cameraAt = (p: number) => cameraBetween(CAMERA_KEYS, p);
