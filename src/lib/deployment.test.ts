import { describe, expect, it } from "vitest";
import { deploymentUrl, isIndexable } from "./deployment";
import { site } from "./site";

describe("deploymentUrl", () => {
  it("sense res configurat, és el domini del client", () => {
    expect(deploymentUrl({})).toBe(site.url);
  });

  it("a Vercel, és l'adreça de producció del projecte", () => {
    expect(deploymentUrl({ VERCEL_PROJECT_PRODUCTION_URL: "arenda-construcciones-web.vercel.app" })).toBe("https://arenda-construcciones-web.vercel.app");
  });

  it("una adreça fixada a mà mana, i se li treu la barra final", () => {
    expect(deploymentUrl({ SITE_URL: "https://quality-constructions.com/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://quality-constructions.com");
  });
});

describe("isIndexable", () => {
  it("per defecte no s'indexa: una previsualització no ha de competir amb la web del client", () => {
    expect(isIndexable({})).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: "1" })).toBe(false);
  });

  it("només s'indexa si es diu explícitament", () => {
    expect(isIndexable({ SITE_INDEXABLE: "true" })).toBe(true);
  });
});
