export const locales = ["ca", "es", "en"] as const;
export type Locale = (typeof locales)[number];

/** L'idioma que viu a l'arrel. Canviar-lo vol dir moure les pàgines de grup a `src/app`. */
export const defaultLocale: Locale = "ca";

export const htmlLang: Record<Locale, string> = { ca: "ca", es: "es", en: "en" };
export const ogLocale: Record<Locale, string> = { ca: "ca_ES", es: "es_ES", en: "en_GB" };
export const homePath: Record<Locale, string> = { ca: "/", es: "/es", en: "/en" };
export const legalPath: Record<Locale, string> = { ca: "/avis-legal", es: "/es/aviso-legal", en: "/en/legal-notice" };

/** Totes les pàgines que existeixen en cada idioma. */
const pages = [homePath, legalPath];

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/$/, "") : path);

/** La mateixa pàgina en un altre idioma; si no la coneixem, la portada d'aquell idioma. */
export function alternatePath(pathname: string, target: Locale) {
  const current = normalize(pathname);
  const page = pages.find((paths) => locales.some((locale) => paths[locale] === current));
  return page ? page[target] : homePath[target];
}

/** Àncora d'una secció de la portada, des de qualsevol pàgina: `/es#contacte`, `/#contacte`. */
export const homeAnchor = (locale: Locale, hash: `#${string}`) => `${homePath[locale]}${hash}`;

/** Enllaços `hreflang` d'una pàgina que existeix en tots els idiomes. */
export function languageAlternates(paths: Record<Locale, string>) {
  return {
    ...Object.fromEntries(locales.map((locale) => [htmlLang[locale], paths[locale]])),
    "x-default": paths[defaultLocale],
  };
}
