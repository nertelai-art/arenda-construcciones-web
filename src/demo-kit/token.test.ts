import { describe, expect, it } from "vitest";
import { parseRevoked, signDemoToken, slugify, verifyDemoToken } from "./token";

const secret = "un-secret-de-proves-prou-llarg";
const now = Date.UTC(2026, 9, 15, 10, 0, 0);
const day = 86_400_000;

describe("enllaços personals", () => {
  it("un enllaç fet amb el secret de la web obri la web, i diu de quin lead és", async () => {
    const token = await signDemoToken(secret, { site: "culleramotor", name: "Cullera Motor", days: 15, now });
    const verdict = await verifyDemoToken(secret, token, { site: "culleramotor", now: now + day });
    expect(verdict).toEqual({ ok: true, lead: { site: "culleramotor", lead: "cullera-motor", name: "Cullera Motor", expires: now / 1000 + 15 * 86_400, issued: now / 1000 } });
  });

  it("caduca quan toca", async () => {
    const token = await signDemoToken(secret, { site: "culleramotor", name: "Cullera Motor", days: 15, now });
    expect(await verifyDemoToken(secret, token, { site: "culleramotor", now: now + 15 * day - 1000 })).toMatchObject({ ok: true });
    expect(await verifyDemoToken(secret, token, { site: "culleramotor", now: now + 15 * day })).toEqual({ ok: false, reason: "expired" });
  });

  it("no val per a una altra web", async () => {
    const token = await signDemoToken(secret, { site: "culleramotor", name: "Cullera Motor", days: 15, now });
    expect(await verifyDemoToken(secret, token, { site: "ceramicaferres", now })).toEqual({ ok: false, reason: "site" });
  });

  it("no es pot falsificar: ni amb un altre secret ni tocant-ne el contingut", async () => {
    const token = await signDemoToken(secret, { site: "culleramotor", name: "Cullera Motor", days: 15, now });
    expect(await verifyDemoToken("un-altre-secret", token, { site: "culleramotor", now })).toEqual({ ok: false, reason: "signature" });
    const forged = await signDemoToken("un-altre-secret", { site: "culleramotor", name: "Algú", days: 999, now });
    const [body] = forged.split(".");
    const [, signed] = token.split(".");
    expect(await verifyDemoToken(secret, `${body}.${signed}`, { site: "culleramotor", now })).toEqual({ ok: false, reason: "signature" });
  });

  it("un enllaç anul·lat deixa de valdre encara que no haja caducat", async () => {
    const token = await signDemoToken(secret, { site: "culleramotor", name: "Cullera Motor", days: 15, now });
    expect(await verifyDemoToken(secret, token, { site: "culleramotor", now, revoked: ["cullera-motor"] })).toEqual({ ok: false, reason: "revoked" });
  });

  it("el que no és un enllaç no peta", async () => {
    for (const token of ["", "abc", "a.b.c", "!!!.???"]) {
      expect((await verifyDemoToken(secret, token, { site: "culleramotor", now })).ok).toBe(false);
    }
  });

  it("guarda els noms amb accents", async () => {
    const token = await signDemoToken(secret, { site: "ceramicaferres", name: "Ceràmica Ferrés", days: 7, now });
    const verdict = await verifyDemoToken(secret, token, { site: "ceramicaferres", now });
    expect(verdict.ok && verdict.lead).toMatchObject({ lead: "ceramica-ferres", name: "Ceràmica Ferrés" });
  });
});

describe("slugify i parseRevoked", () => {
  it("passa els noms a identificador i llig la llista d'anul·lats", () => {
    expect(slugify("  L'Arenda Construccions 2003 ")).toBe("l-arenda-construccions-2003");
    expect(parseRevoked(" cullera-motor, ,ceramica-ferres ")).toEqual(["cullera-motor", "ceramica-ferres"]);
    expect(parseRevoked(undefined)).toEqual([]);
  });
});
