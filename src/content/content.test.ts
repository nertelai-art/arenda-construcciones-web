import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n";
import { ca } from "./ca";
import { getDictionary } from "./index";
import { photos } from "./photos";

/** Totes les llistes d'un diccionari amb la seva llargada, per comparar-ne l'estructura. */
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`, ...value.flatMap((item, index) => shape(item, `${path}.${index}`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => shape(item, path ? `${path}.${key}` : key));
  return [path];
}

describe("diccionaris", () => {
  it("tots els idiomes tenen exactament la mateixa estructura que el català", () => {
    for (const locale of locales) expect(shape(getDictionary(locale)), locale).toEqual(shape(ca));
  });

  it("les escenes tenen els passos que esperen les coreografies", () => {
    for (const locale of locales) {
      const t = getDictionary(locale);
      expect(t.anatomy.steps).toHaveLength(6);
      expect(t.renovation.steps).toHaveLength(5);
    }
  });

  it("cada obra apunta a una foto que existeix", () => {
    for (const locale of locales) {
      for (const item of getDictionary(locale).works.items) expect(Object.keys(photos)).toContain(item.photo);
    }
  });

  it("cap text no queda buit ni amb una clau `{…}` per omplir que no toca", () => {
    const allowed = new Set(["{link}", "{email}", "{name}"]);
    // El prefix i el sufix de les xifres («+», «») poden anar buits a posta.
    const mayBeEmpty = new Set(["prefix", "suffix"]);
    for (const locale of locales) {
      const walk = (value: unknown, key = ""): void => {
        if (typeof value === "string") {
          if (!mayBeEmpty.has(key)) expect(value.trim(), `${locale}: ${key}`).not.toBe("");
          for (const token of value.match(/\{\w+\}/g) ?? []) expect(allowed.has(token), `${locale}: ${value}`).toBe(true);
        } else if (value && typeof value === "object") Object.entries(value).forEach(([child, item]) => walk(item, child));
      };
      walk(getDictionary(locale));
    }
  });
});
