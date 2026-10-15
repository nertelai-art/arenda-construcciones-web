/**
 * La pàgina que veu qui entra a una demo sense un enllaç vàlid. És la mateixa a totes les webs:
 * explica per què no hi pot entrar i fa conéixer Nertel. Un document sencer i sense res de fora
 * (el logotip va incrustat; les tipografies, si no carreguen, cauen a les del sistema).
 */
import { NERTEL_LOGO } from "./nertel-logo";

export type BlockedLocale = "ca" | "es";

const texts = {
  ca: {
    title: "Demo privada · Nertel",
    eyebrow: "Demo privada",
    heading: "Aquesta web és una demo privada.",
    body: "L'ha preparada Nertel per a una empresa concreta, i només s'hi pot entrar amb l'enllaç personal que li hem enviat.",
    expired: "L'enllaç que has fet servir ja ha caducat.",
    again: "Si te l'han passat i no s'obri, demana'n un de nou a qui te l'ha enviat.",
    promoTitle: "Vols una web així per al teu negoci?",
    promo: "A Nertel fem webs ràpides i que es recorden, i agents de veu i de WhatsApp amb IA que atenen les trucades en més de 30 idiomes.",
    cta: "Coneix Nertel",
    contact: "O escriu-nos a",
    path: "/ca",
  },
  es: {
    title: "Demo privada · Nertel",
    eyebrow: "Demo privada",
    heading: "Esta web es una demo privada.",
    body: "La ha preparado Nertel para una empresa concreta, y solo se puede entrar con el enlace personal que le hemos enviado.",
    expired: "El enlace que has usado ya ha caducado.",
    again: "Si te lo han pasado y no se abre, pide uno nuevo a quien te lo envió.",
    promoTitle: "¿Quieres una web así para tu negocio?",
    promo: "En Nertel hacemos webs rápidas y que se recuerdan, y agentes de voz y de WhatsApp con IA que atienden las llamadas en más de 30 idiomas.",
    cta: "Conoce Nertel",
    contact: "O escríbenos a",
    path: "/es",
  },
} satisfies Record<BlockedLocale, Record<string, string>>;

/** Enllaç a nertel.ai que diu de quina demo ve la visita. */
export const nertelUrl = (locale: BlockedLocale, site: string, medium: string) =>
  `https://nertel.ai${texts[locale].path}?utm_source=demo&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(site)}`;

export function blockedPage({ locale, site, expired = false }: { locale: BlockedLocale; site: string; expired?: boolean }) {
  const t = texts[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Poppins:wght@600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    display: grid; place-items: center; min-height: 100vh; padding: 24px 16px;
    background: radial-gradient(120% 80% at 50% 0%, #e3f0f7 0%, #f8fafc 55%) #f8fafc;
    color: #20283c; font: 400 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main {
    width: 100%; max-width: 34rem; padding: 36px 32px; border: 1px solid #e2e8f0; border-radius: 24px;
    background: #fff; box-shadow: 0 24px 60px -32px rgba(7, 79, 116, 0.35);
  }
  .logo { display: block; height: 36px; width: auto; }
  .eyebrow { margin: 28px 0 0; color: #074f74; font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
  h1 { margin: 8px 0 0; font: 600 clamp(26px, 6vw, 32px)/1.15 Poppins, Inter, ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
  p { margin: 14px 0 0; color: #4c5876; }
  .note { margin-top: 10px; font-size: 14px; }
  .promo { margin-top: 28px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
  h2 { margin: 0; font: 600 19px/1.3 Poppins, Inter, ui-sans-serif, system-ui, sans-serif; }
  .cta {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; padding: 12px 22px; border-radius: 999px;
    background: #074f74; color: #fff; font-weight: 500; text-decoration: none; transition: background-color .2s;
  }
  .cta:hover { background: #0a6593; }
  .cta:focus-visible { outline: 3px solid #20283c; outline-offset: 3px; }
  .contact { font-size: 14px; }
  .contact a { color: #074f74; }
  @media (max-width: 480px) { main { padding: 28px 22px; border-radius: 20px; } }
</style>
</head>
<body>
<main>
  <img class="logo" src="${NERTEL_LOGO.src}" width="${NERTEL_LOGO.width / 2}" height="${NERTEL_LOGO.height / 2}" alt="Nertel">
  <p class="eyebrow">${t.eyebrow}</p>
  <h1>${t.heading}</h1>
  <p>${expired ? `${t.expired} ` : ""}${t.body}</p>
  <p class="note">${t.again}</p>
  <section class="promo">
    <h2>${t.promoTitle}</h2>
    <p>${t.promo}</p>
    <a class="cta" href="${nertelUrl(locale, site, "bloqueig")}">${t.cta} <span aria-hidden="true">→</span></a>
    <p class="contact">${t.contact} <a href="mailto:info@nertel.ai">info@nertel.ai</a></p>
  </section>
</main>
</body>
</html>`;
}
