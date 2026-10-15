import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { demoGate, pickLocale } from "./gate";
import { DEMO_ACCESS_COOKIE, DEMO_LEAD_COOKIE, parseLeadCookie } from "./names";
import { signDemoToken } from "./token";

const env = { DEMO_SECRET: "un-secret-de-proves-prou-llarg", DEMO_SITE: "culleramotor" };
const now = Date.UTC(2026, 9, 15, 10, 0, 0);
const link = (name = "Cullera Motor", days = 15, at = now) => signDemoToken(env.DEMO_SECRET, { site: env.DEMO_SITE, name, days, now: at });
const request = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers });

describe("demoGate", () => {
  it("sense secret ni web configurada no fa res: la web és oberta", async () => {
    expect(await demoGate(request("https://demo.test/"), undefined, {}, now)).toBeUndefined();
    expect(await demoGate(request("https://demo.test/"), undefined, { DEMO_SECRET: "x" }, now)).toBeUndefined();
  });

  it("sense enllaç, ensenya la pàgina de bloqueig amb Nertel", async () => {
    const response = await demoGate(request("https://demo.test/estoc/x"), undefined, env, now);
    expect(response?.status).toBe(403);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    const html = await response!.text();
    expect(html).toContain("demo privada");
    expect(html).toContain("https://nertel.ai/ca?utm_source=demo&utm_medium=bloqueig&utm_campaign=culleramotor");
  });

  it("ensenya el bloqueig en castellà si el navegador el prefereix", async () => {
    const html = await (await demoGate(request("https://demo.test/", { "accept-language": "es-ES,es;q=0.9" }), undefined, env, now))!.text();
    expect(html).toContain("Esta web es una demo privada.");
  });

  it("amb l'enllaç, deixa passar i el recorda en aquest navegador", async () => {
    const token = await link();
    const response = await demoGate(request(`https://demo.test/?d=${token}`), undefined, env, now);
    expect(response?.headers.get("x-middleware-next")).toBe("1");
    expect(response?.cookies.get(DEMO_ACCESS_COOKIE)?.value).toBe(token);
    const lead = response?.cookies.get(DEMO_LEAD_COOKIE)?.value ?? "";
    expect(parseLeadCookie(`${DEMO_LEAD_COOKIE}=${lead}`)).toEqual({ site: "culleramotor", lead: "cullera-motor", name: "Cullera Motor" });
  });

  it("la galeta del lead, tal com la rep el navegador, es llig a la primera", async () => {
    const response = await demoGate(request(`https://demo.test/?d=${await link()}`), undefined, env, now);
    const header = response?.headers.getSetCookie().find((cookie) => cookie.startsWith(`${DEMO_LEAD_COOKIE}=`)) ?? "";
    const browserCookie = header.split(";")[0] ?? "";
    expect(parseLeadCookie(browserCookie)).toEqual({ site: "culleramotor", lead: "cullera-motor", name: "Cullera Motor" });
  });

  it("amb la galeta d'una visita anterior, deixa passar sense tornar a demanar l'enllaç", async () => {
    const token = await link();
    expect(await demoGate(request("https://demo.test/estoc/x", { cookie: `${DEMO_ACCESS_COOKIE}=${token}` }), undefined, env, now)).toBeUndefined();
  });

  it("un enllaç caducat no passa, i la pàgina ho diu", async () => {
    const token = await link("Cullera Motor", 1, now - 2 * 86_400_000);
    const response = await demoGate(request(`https://demo.test/?d=${token}`), undefined, env, now);
    expect(response?.status).toBe(403);
    expect(await response!.text()).toContain("ja ha caducat");
  });

  it("un enllaç anul·lat no passa", async () => {
    const token = await link();
    const response = await demoGate(request(`https://demo.test/?d=${token}`), undefined, { ...env, DEMO_REVOKED: "cullera-motor" }, now);
    expect(response?.status).toBe(403);
  });

  it("avisa el webhook la primera vegada que el lead obri la demo en un navegador, i no les següents", async () => {
    const fetch = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const pending: Promise<unknown>[] = [];
    const event = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) };
    const token = await link();
    const withHook = { ...env, DEMO_NOTIFY_URL: "https://hooks.test/demo" };
    await demoGate(request(`https://demo.test/?d=${token}`, { "x-vercel-ip-city": "Cullera", "x-vercel-ip-country": "ES" }), event, withHook, now);
    await Promise.all(pending);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hooks.test/demo");
    expect(JSON.parse(String(init.body))).toMatchObject({ event: "demo_opened", site: "culleramotor", lead: "cullera-motor", city: "Cullera", country: "ES" });

    await demoGate(request(`https://demo.test/?d=${token}`, { cookie: `${DEMO_ACCESS_COOKIE}=${token}` }), event, withHook, now);
    await Promise.all(pending);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("pickLocale", () => {
  it("castellà només si és la primera llengua del navegador", () => {
    expect(pickLocale("es-ES,es;q=0.9,ca;q=0.8")).toBe("es");
    expect(pickLocale("ca-ES,ca;q=0.9,es;q=0.8")).toBe("ca");
    expect(pickLocale("en-US")).toBe("ca");
    expect(pickLocale(null)).toBe("ca");
  });
});
