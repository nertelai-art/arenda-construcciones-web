import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import imageLoader, { imageWidths } from "./image-loader";
import { photos } from "@/content/photos";

describe("imageLoader", () => {
  it("dona el fitxer més petit que cobreix l'amplada demanada", () => {
    expect(imageLoader({ src: "/images/vila-piscina.webp", width: 320 })).toBe("/images/vila-piscina-640.webp");
    expect(imageLoader({ src: "/images/vila-piscina.webp", width: 640 })).toBe("/images/vila-piscina-640.webp");
    expect(imageLoader({ src: "/images/vila-piscina.webp", width: 641 })).toBe("/images/vila-piscina-1080.webp");
    expect(imageLoader({ src: "/images/vila-piscina.webp", width: 1920 })).toBe("/images/vila-piscina-2400.webp");
  });

  it("mai demana una amplada que no existeix", () => {
    expect(imageLoader({ src: "/images/a.webp", width: 3840 })).toBe(`/images/a-${imageWidths[imageWidths.length - 1]}.webp`);
  });

  it("deixa tal qual el que no és una foto preparada", () => {
    expect(imageLoader({ src: "/brand/logo-arenda.png", width: 256 })).toBe("/brand/logo-arenda.png");
    expect(imageLoader({ src: "/og.jpg", width: 1200 })).toBe("/og.jpg");
  });

  it("cada foto que fa servir la pàgina existeix a totes les amplades", () => {
    for (const photo of Object.values(photos)) {
      for (const width of imageWidths) {
        const file = `public${photo.src.replace(/\.webp$/, `-${width}.webp`)}`;
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
