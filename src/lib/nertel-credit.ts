import type { Locale } from "./i18n";

/**
 * D'on ve la visita, per a l'analítica de nertel.ai. El mateix format a totes les webs de clients:
 * el host, sense protocol ni `www.`. Ara és l'adreça de Vercel perquè el web encara no és al domini
 * del client; quan hi passi (quality-constructions.com), es canvia aquí i a la prova.
 */
const SOURCE = "arenda-construcciones-web.vercel.app";

/** nertel.ai té català, castellà i anglès (i més): cada idioma del web porta al mateix de nertel.ai. */
export function nertelCreditUrl(locale: Locale) {
  return `https://nertel.ai/${locale}?utm_source=${SOURCE}&utm_medium=credit`;
}
