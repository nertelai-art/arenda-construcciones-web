/**
 * Enllaços personals de les demos de Nertel. Cada lead rep l'adreça de la web amb un codi signat
 * (`?d=…`) que diu per a quina web és, per a qui i fins quan val. Sense el secret de la web
 * (`DEMO_SECRET`) no se'n pot fer cap ni falsificar-ne cap.
 *
 * Funcions pures sobre Web Crypto: funcionen igual al proxy de Next, a les proves i a l'script que
 * fa els enllaços. L'hora entra per paràmetre.
 */

export type DemoLead = {
  /** Web per a la qual val l'enllaç (`DEMO_SITE`). */
  site: string;
  /** Identificador del lead: el nom passat a minúscules i guions. */
  lead: string;
  /** Nom del lead tal com s'ha escrit en fer l'enllaç. */
  name: string;
  /** Fins quan val, en segons Unix. */
  expires: number;
  /** Quan es va fer, en segons Unix. */
  issued: number;
};

export type DemoVerdict = { ok: true; lead: DemoLead } | { ok: false; reason: "malformed" | "signature" | "site" | "expired" | "revoked" };

type Payload = { s: string; l: string; n: string; e: number; i: number };

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));

async function signature(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body))));
}

/** Compara sense eixir abans d'hora: el temps de resposta no diu quants caràcters encerta un codi fals. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

/** `Ceràmica Ferrés` → `ceramica-ferres`. */
export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function signDemoToken(secret: string, options: { site: string; name: string; days: number; now: number }) {
  const issued = Math.floor(options.now / 1000);
  const payload: Payload = { s: options.site, l: slugify(options.name), n: options.name.trim(), e: issued + Math.round(options.days * 86_400), i: issued };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await signature(secret, body)}`;
}

const isPayload = (value: unknown): value is Payload => {
  const payload = value as Partial<Payload> | null;
  return !!payload && typeof payload.s === "string" && typeof payload.l === "string" && typeof payload.n === "string" && typeof payload.e === "number" && typeof payload.i === "number";
};

export async function verifyDemoToken(secret: string, token: string, options: { site: string; now: number; revoked?: readonly string[] }): Promise<DemoVerdict> {
  const [body, signed, extra] = token.split(".");
  if (!body || !signed || extra !== undefined) return { ok: false, reason: "malformed" };
  if (!sameText(await signature(secret, body), signed)) return { ok: false, reason: "signature" };
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isPayload(payload)) return { ok: false, reason: "malformed" };
  if (payload.s !== options.site) return { ok: false, reason: "site" };
  if (payload.e * 1000 <= options.now) return { ok: false, reason: "expired" };
  if (options.revoked?.includes(payload.l)) return { ok: false, reason: "revoked" };
  return { ok: true, lead: { site: payload.s, lead: payload.l, name: payload.n, expires: payload.e, issued: payload.i } };
}

/** La llista d'`DEMO_REVOKED`: identificadors de lead separats per comes. */
export const parseRevoked = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
