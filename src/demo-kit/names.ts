/**
 * Noms que comparteixen la porta (servidor) i el seguiment (navegador). Sense dependències: el
 * navegador ho pot importar sense arrossegar res del servidor.
 */

/** Paràmetre de l'adreça on va el codi de l'enllaç personal: `…/?d=…`. */
export const DEMO_QUERY = "d";
/** Galeta amb el codi, perquè no calga tornar a obrir l'enllaç. Només la llig el servidor. */
export const DEMO_ACCESS_COOKIE = "nertel_demo";
/** Galeta amb qui és el lead, perquè el seguiment el puga identificar. No porta res secret. */
export const DEMO_LEAD_COOKIE = "nertel_demo_lead";

export type LeadCookie = { site: string; lead: string; name: string };

export function parseLeadCookie(cookies: string): LeadCookie | null {
  const raw = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${DEMO_LEAD_COOKIE}=`))
    ?.slice(DEMO_LEAD_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<LeadCookie>;
    return typeof value.site === "string" && typeof value.lead === "string" && typeof value.name === "string" ? { site: value.site, lead: value.lead, name: value.name } : null;
  } catch {
    return null;
  }
}
