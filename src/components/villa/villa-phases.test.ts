import { describe, expect, it } from "vitest";
import { stagger } from "@/lib/easing";
import * as bath from "../bath/bath-phases";
import * as villa from "./villa-phases";

describe.each([
  ["vila", villa.STEPS, villa.BEATS],
  ["bany", bath.STEPS, bath.BEATS],
] as const)("passos de %s", (_name, steps, beats) => {
  it("cobreixen de 0 a 1 sense forats ni solapaments", () => {
    expect(steps[0]![0]).toBe(0);
    expect(steps[steps.length - 1]![1]).toBe(1);
    for (let index = 1; index < steps.length; index++) expect(steps[index]![0]).toBe(steps[index - 1]![1]);
  });

  it("cada moviment és dins de 0–1 i acaba després de començar", () => {
    for (const [start, end] of Object.values(beats)) {
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(1);
      expect(end).toBeGreaterThan(start);
    }
  });
});

describe("vila", () => {
  it("el pas actiu segueix el progrés", () => {
    expect(villa.stepAt(0)).toBe(0);
    expect(villa.stepAt(0.2)).toBe(1);
    expect(villa.stepAt(0.5)).toBe(3);
    expect(villa.stepAt(1)).toBe(5);
  });

  it("la casa s'obre a les instal·lacions i està tancada abans i després", () => {
    expect(villa.explodeAt(0.4)).toBe(0);
    expect(villa.explodeAt(0.6)).toBeCloseTo(1, 1);
    expect(villa.explodeAt(0.7)).toBe(0);
  });

  it("el plànol dibuixat es veu al principi i ha marxat al final", () => {
    expect(villa.ghostAt(0)).toBe(0);
    expect(villa.ghostAt(0.3)).toBe(1);
    expect(villa.ghostAt(1)).toBe(0);
  });

  it("només es fa fosc al final", () => {
    expect(villa.duskAt(0.9)).toBe(0);
    expect(villa.duskAt(1)).toBe(1);
  });

  it("la càmera passa exactament pels punts clau i no salta entre trams", () => {
    expect(villa.cameraAt(0)).toEqual({ azimuth: 0.3, elevation: 1.12, fit: 24, targetY: 0 });
    expect(villa.cameraAt(1)).toEqual({ azimuth: 0.24, elevation: 0.38, fit: 26, targetY: 1.5 });
    for (let p = 0; p < 1; p += 0.01) {
      const a = villa.cameraAt(p);
      const b = villa.cameraAt(p + 0.01);
      expect(Math.abs(a.azimuth - b.azimuth)).toBeLessThan(0.08);
      expect(Math.abs(a.fit - b.fit)).toBeLessThan(1.5);
    }
  });

  it("la càmera mai no baixa prou per ensenyar l'horitzó", () => {
    for (let p = 0; p <= 1; p += 0.005) expect(villa.cameraAt(p).elevation).toBeGreaterThanOrEqual(0.38);
  });
});

describe("bany", () => {
  it("el pas actiu segueix el progrés", () => {
    expect(bath.stepAt(0.05)).toBe(0);
    expect(bath.stepAt(0.5)).toBe(2);
    expect(bath.stepAt(1)).toBe(4);
  });

  it("la llum s'encén només al final", () => {
    expect(bath.glowAt(0.8)).toBe(0);
    expect(bath.glowAt(1)).toBe(1);
  });
});

describe("stagger", () => {
  it("la primera peça comença a 0 i l'última acaba a 1", () => {
    expect(stagger(0, 0, 5)).toBe(0);
    expect(stagger(1, 4, 5)).toBe(1);
    expect(stagger(0.999, 4, 5)).toBeLessThan(1);
  });

  it("cada peça comença després de l'anterior", () => {
    expect(stagger(0.2, 0, 5)).toBeGreaterThan(stagger(0.2, 1, 5));
  });
});
