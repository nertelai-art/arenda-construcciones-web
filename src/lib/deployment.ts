import { site } from "./site";

/**
 * On està publicat aquest desplegament i si els cercadors el poden indexar. Mentre el web no
 * sigui al domini del client (per exemple, a l'adreça `vercel.app` de la previsualització), no
 * s'indexa: seria una segona web d'Arenda competint amb la seva.
 *
 * - `SITE_URL`: adreça pública, si es vol fixar a mà.
 * - `VERCEL_PROJECT_PRODUCTION_URL`: la posa Vercel sola a cada build.
 * - `SITE_INDEXABLE=true`: permet indexar. Només quan el web ja sigui al seu domini.
 */
type Env = Readonly<Record<string, string | undefined>>;

export function deploymentUrl(env: Env = process.env) {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return site.url;
}

export const isIndexable = (env: Env = process.env) => env.SITE_INDEXABLE === "true";
