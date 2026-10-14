// Progrés de les escenes guiades pel scroll. Funcions pures: `scroll-scene.ts` llegeix les mides
// a cada fotograma i les passa aquí. Mateix criteri que a culleramotor.

export type SceneBox = {
  /** On és la vora de dalt de la secció respecte a la finestra (negatiu quan ja ha pujat). */
  top: number;
  /** Alçada de la secció sencera. */
  height: number;
  /** Alçada del contingut enganxós (0 si no n'hi ha o l'escena ja està plegada). */
  sticky: number;
  /** Alçada de la finestra. */
  viewport: number;
};

/**
 * Progrés (0-1): 0 quan el contingut enganxós s'enganxa i 1 quan es desenganxa. Es mesura contra
 * el contingut enganxós (100svh) i no contra la finestra: en un mòbil la finestra creix i s'encongeix
 * quan el navegador amaga o ensenya les barres, i l'escena faria un salt.
 */
export function sceneProgress({ top, height, sticky, viewport }: SceneBox) {
  const distance = height - (sticky > 0 ? sticky : viewport);
  if (distance <= 0) return 1;
  // El scroll s'atura en píxels sencers però la secció pot començar a mig píxel: a menys d'un píxel
  // del final ja és el final (si no, l'escena no quedava mai acabada en aturar-s'hi just).
  if (distance + top < 1) return 1;
  return Math.min(1, Math.max(0, -top / distance));
}

/**
 * Una escena que ja s'ha vist fins al final s'hi queda: tornar a pujar no la rebobina. Per tornar-la
 * a veure hi ha el botó de repetir, que la torna a deixar sense acabar.
 */
export function heldProgress(progress: number, done: boolean) {
  const finished = done || progress >= 1;
  return { done: finished, progress: finished ? 1 : progress };
}

/** Per a les línies que es pinten amb el scroll: el que ja s'ha pintat no es despinta. */
export const maxProgress = (value: number, previous: number) => Math.max(value, previous);
