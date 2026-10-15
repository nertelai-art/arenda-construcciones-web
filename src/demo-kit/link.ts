/**
 * Fa l'enllaç personal d'un lead per a aquesta web.
 *
 *   pnpm demo:link "Cullera Motor"            (val 15 dies)
 *   pnpm demo:link "Cullera Motor" --days 30
 *
 * Llig `DEMO_SECRET`, `DEMO_SITE` i `DEMO_URL` de `.env.local`, que no es puja mai al repositori.
 */
import { signDemoToken } from "./token.ts";

const args = process.argv.slice(2);
const name = args.find((arg) => !arg.startsWith("--") && args[args.indexOf(arg) - 1] !== "--days");
const daysIndex = args.indexOf("--days");
const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 15;
const { DEMO_SECRET: secret, DEMO_SITE: site, DEMO_URL: url } = process.env;

if (!name || !Number.isFinite(days) || days <= 0) {
  console.error('Ús: pnpm demo:link "Nom del lead" [--days 15]');
  process.exit(1);
}
if (!secret || !site || !url) {
  console.error("Falten DEMO_SECRET, DEMO_SITE o DEMO_URL a .env.local.");
  process.exit(1);
}

const now = Date.now();
const token = await signDemoToken(secret, { site, name, days, now });
const until = new Intl.DateTimeFormat("ca", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" }).format(new Date(now + days * 86_400_000));
console.log(`${url.replace(/\/$/, "")}/?d=${token}`);
console.log(`Per a: ${name} · val fins al ${until}`);
