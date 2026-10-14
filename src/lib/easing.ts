// Corbes i utilitats de les coreografies. TypeScript pur: les fan servir les escenes i l'HTML.

export type Range = readonly [number, number];

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** On som dins d'un tram: 0 abans de començar, 1 en acabar. */
export const segment = (p: number, [start, end]: Range) => clamp01((p - start) / (end - start));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export function easeOutBounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

/** Tram esglaonat: la peça `index` de `count` comença una mica després de l'anterior. */
export function stagger(t: number, index: number, count: number, overlap = 0.6) {
  if (count <= 1) return clamp01(t);
  const span = 1 / (1 + (count - 1) * (1 - overlap));
  const start = index * span * (1 - overlap);
  return clamp01((t - start) / span);
}

/** Índex del pas actiu d'una llista de trams consecutius. */
export function stepIndex(p: number, steps: readonly Range[]) {
  const index = steps.findIndex(([, end]) => p < end);
  return index === -1 ? steps.length - 1 : index;
}

export type CameraPose = { azimuth: number; elevation: number; fit: number; targetY: number };
export type CameraKey = readonly [progress: number, azimuth: number, elevation: number, fit: number, targetY: number];

/** Posició de càmera entre punts clau, amb una corba suau a cada tram. */
export function cameraBetween(keys: readonly CameraKey[], p: number): CameraPose {
  const progress = clamp01(p);
  let index = 0;
  while (index < keys.length - 2 && progress > keys[index + 1]![0]) index++;
  const from = keys[index]!;
  const to = keys[index + 1]!;
  const t = easeInOut(segment(progress, [from[0], to[0]]));
  return { azimuth: lerp(from[1], to[1], t), elevation: lerp(from[2], to[2], t), fit: lerp(from[3], to[3], t), targetY: lerp(from[4], to[4], t) };
}
