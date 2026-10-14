import { describe, expect, it } from "vitest";
import { heldProgress, maxProgress, sceneProgress } from "./scene-progress";

// Un mòbil: amb les barres del navegador a la vista la finestra fa 690 px, i sense, 800. El
// contingut enganxós fa 100svh, és a dir, 690 px sempre.
const section = { height: 690 * 6, sticky: 690 };

describe("sceneProgress", () => {
  it("va de 0, quan el contingut s'enganxa, a 1, quan es desenganxa", () => {
    expect(sceneProgress({ ...section, top: 0, viewport: 690 })).toBe(0);
    expect(sceneProgress({ ...section, top: -690 * 2.5, viewport: 690 })).toBe(0.5);
    expect(sceneProgress({ ...section, top: -690 * 5, viewport: 690 })).toBe(1);
  });

  it("no salta quan el navegador amaga les barres i la finestra creix", () => {
    const top = -690 * 2.5;
    expect(sceneProgress({ ...section, top, viewport: 800 })).toBe(sceneProgress({ ...section, top, viewport: 690 }));
  });

  it("queda dins de 0–1 abans i després de la secció", () => {
    expect(sceneProgress({ ...section, top: 500, viewport: 690 })).toBe(0);
    expect(sceneProgress({ ...section, top: -99999, viewport: 690 })).toBe(1);
  });

  it("aturar-se just al final compta com al final, encara que la secció comenci a mig píxel", () => {
    // La vila a 1440 × 900: la secció comença a y = 2680,34 i el scroll s'atura en un enter.
    expect(sceneProgress({ top: -4139.66, height: 5040, sticky: 900, viewport: 900 })).toBe(1);
  });

  it("sense contingut enganxós (escena plegada), es mesura contra la finestra", () => {
    expect(sceneProgress({ top: 0, height: 690, sticky: 0, viewport: 690 })).toBe(1);
  });
});

describe("heldProgress", () => {
  it("mentre no s'ha acabat, l'escena segueix el scroll en les dues direccions", () => {
    expect(heldProgress(0.4, false)).toEqual({ done: false, progress: 0.4 });
    expect(heldProgress(0.2, false)).toEqual({ done: false, progress: 0.2 });
  });

  it("quan arriba al final, queda acabada", () => {
    expect(heldProgress(1, false)).toEqual({ done: true, progress: 1 });
  });

  it("una escena acabada es queda al final encara que es torni a pujar", () => {
    expect(heldProgress(0.3, true)).toEqual({ done: true, progress: 1 });
    expect(heldProgress(0, true)).toEqual({ done: true, progress: 1 });
  });
});

describe("maxProgress", () => {
  it("una línia que ja s'ha pintat no es despinta en tornar a pujar", () => {
    expect(maxProgress(0.2, 0.5)).toBe(0.5);
    expect(maxProgress(0.7, 0.5)).toBe(0.7);
  });
});
