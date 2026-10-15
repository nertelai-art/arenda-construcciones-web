import { Open_Sans, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { getDictionary } from "@/content";
import { DemoBadge } from "@/demo-kit/DemoBadge";
import { DemoTracker } from "@/demo-kit/DemoTracker";
import { homeAnchor, htmlLang, type Locale } from "@/lib/i18n";
import { businessJsonLd } from "@/lib/seo";
import { BrushDefs } from "../ui/Brush";
import { RevealObserver } from "../ui/RevealObserver";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { JsonLd } from "./JsonLd";
import { MobileBar } from "./MobileBar";
import "@/app/globals.css";

// Schibsted Grotesk als titulars; Open Sans, la lletra del logotip i del rètol del showroom, al text.
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" });

export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getDictionary(locale);
  return (
    <html lang={htmlLang[locale]} className={`${schibsted.variable} ${openSans.variable}`} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- regla del Pages Router; a l'App Router el layout arrel pot tenir <head>. */}
      <head>
        {/* Marca que hi ha JS abans de pintar, perquè les escenes i els revelats no facin pampallugues. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a href="#contingut" className="btn skip">
          {t.nav.skip}
        </a>
        <BrushDefs />
        <JsonLd data={businessJsonLd(t.meta.description)} />
        <Header locale={locale} t={t.nav} />
        <main id="contingut">{children}</main>
        <Footer locale={locale} t={t} />
        <MobileBar t={t.mobileBar} whatsappMessage={t.hero.whatsappMessage} contactHref={homeAnchor(locale, "#contacte")} />
        <RevealObserver />
        <DemoTracker site="arenda-construcciones" />
        {/* La insígnia de la demo només parla valencià i castellà. */}
        <DemoBadge site="arenda-construcciones" locale={locale === "ca" ? "ca" : "es"} />
      </body>
    </html>
  );
}
