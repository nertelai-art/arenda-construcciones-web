/**
 * La porta de les demos, per al `proxy.ts` de cada web (vegeu el README del kit).
 *
 * Sense `DEMO_SECRET` i `DEMO_SITE` no fa res: la web queda oberta (en local, o quan ja és la web de
 * debò del client). Amb ells, només passa qui porta un enllaç personal vàlid (`?d=…`) o ja hi ha
 * entrat amb un en aquest navegador; la resta veu la pàgina de bloqueig, la mateixa a totes les webs.
 */
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { blockedPage, type BlockedLocale } from "./blocked";
import { DEMO_ACCESS_COOKIE, DEMO_LEAD_COOKIE, DEMO_QUERY, type LeadCookie } from "./names";
import { parseRevoked, verifyDemoToken, type DemoLead } from "./token";

type Env = Readonly<Record<string, string | undefined>>;

/** Castellà si el navegador el prefereix; si no, valencià. */
export const pickLocale = (acceptLanguage: string | null): BlockedLocale => (/^\s*es\b/i.test(acceptLanguage ?? "") ? "es" : "ca");

function remember(response: NextResponse, request: NextRequest, token: string, lead: DemoLead, now: number) {
  const options = { path: "/", sameSite: "lax" as const, secure: request.nextUrl.protocol === "https:", maxAge: Math.max(0, lead.expires - Math.floor(now / 1000)) };
  const cookie: LeadCookie = { site: lead.site, lead: lead.lead, name: lead.name };
  response.cookies.set(DEMO_ACCESS_COOKIE, token, { ...options, httpOnly: true });
  // Sense codificar: Next ja ho fa en escriure la galeta, i codificar-ho dues vegades la faria illegible.
  response.cookies.set(DEMO_LEAD_COOKIE, JSON.stringify(cookie), options);
}

/** Avís al webhook de `DEMO_NOTIFY_URL` (n8n, Slack…) quan un lead obri la demo en un navegador nou. */
async function notify(url: string, request: NextRequest, lead: DemoLead, now: number) {
  const city = request.headers.get("x-vercel-ip-city");
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "demo_opened",
        site: lead.site,
        lead: lead.lead,
        name: lead.name,
        path: request.nextUrl.pathname,
        at: new Date(now).toISOString(),
        country: request.headers.get("x-vercel-ip-country"),
        city: city ? decodeURIComponent(city) : null,
        userAgent: request.headers.get("user-agent"),
      }),
    });
  } catch {
    // L'avís no pot impedir que la demo s'obriga.
  }
}

export async function demoGate(request: NextRequest, event?: Pick<NextFetchEvent, "waitUntil">, env: Env = process.env, now = Date.now()): Promise<NextResponse | undefined> {
  const secret = env.DEMO_SECRET;
  const site = env.DEMO_SITE;
  if (!secret || !site) return undefined;

  const revoked = parseRevoked(env.DEMO_REVOKED);
  const linkToken = request.nextUrl.searchParams.get(DEMO_QUERY);
  const cookieToken = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  const fromLink = linkToken ? await verifyDemoToken(secret, linkToken, { site, now, revoked }) : null;
  const fromCookie = cookieToken ? await verifyDemoToken(secret, cookieToken, { site, now, revoked }) : null;

  if (linkToken && fromLink?.ok) {
    const response = NextResponse.next();
    remember(response, request, linkToken, fromLink.lead, now);
    if (!fromCookie?.ok && env.DEMO_NOTIFY_URL) event?.waitUntil(notify(env.DEMO_NOTIFY_URL, request, fromLink.lead, now));
    return response;
  }
  if (fromCookie?.ok) return undefined;

  const expired = fromLink?.ok === false && fromLink.reason === "expired" ? true : fromCookie?.ok === false && fromCookie.reason === "expired";
  return new NextResponse(blockedPage({ locale: pickLocale(request.headers.get("accept-language")), site, expired }), {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

/**
 * Per on passa la porta: tot menys els fitxers de Next amb hash, la icona, el robots.txt i les
 * imatges per a xarxes (WhatsApp ensenya la vista prèvia de l'enllaç sense galetes).
 */
export const demoMatcher = ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|robots\\.txt|opengraph-image|twitter-image).*)"];
