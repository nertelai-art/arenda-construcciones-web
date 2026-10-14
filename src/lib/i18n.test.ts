import { describe, expect, it } from "vitest";
import { alternatePath, homeAnchor, languageAlternates, legalPath } from "./i18n";

describe("alternatePath", () => {
  it("porta a la mateixa pàgina en l'altre idioma", () => {
    expect(alternatePath("/", "es")).toBe("/es");
    expect(alternatePath("/es", "en")).toBe("/en");
    expect(alternatePath("/en", "ca")).toBe("/");
    expect(alternatePath("/avis-legal", "en")).toBe("/en/legal-notice");
    expect(alternatePath("/es/aviso-legal", "ca")).toBe("/avis-legal");
  });

  it("no es perd amb una barra final", () => {
    expect(alternatePath("/es/", "ca")).toBe("/");
    expect(alternatePath("/en/legal-notice/", "es")).toBe("/es/aviso-legal");
  });

  it("una pàgina que no existeix porta a la portada de l'idioma", () => {
    expect(alternatePath("/no-existeix", "en")).toBe("/en");
  });
});

describe("homeAnchor", () => {
  it("és la mateixa URL de la portada amb l'àncora, sense barra de més", () => {
    expect(homeAnchor("ca", "#contacte")).toBe("/#contacte");
    expect(homeAnchor("es", "#contacte")).toBe("/es#contacte");
  });
});

describe("languageAlternates", () => {
  it("dona un enllaç per idioma i el català per defecte", () => {
    expect(languageAlternates(legalPath)).toEqual({ ca: "/avis-legal", es: "/es/aviso-legal", en: "/en/legal-notice", "x-default": "/avis-legal" });
  });
});
