import type { Metadata } from "next";
import { languageAlternates, ogLocale, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/** Metadades comunes d'una pàgina que existeix en tots els idiomes. */
export function pageMetadata({ locale, title, description, paths }: { locale: Locale; title: string; description: string; paths: Record<Locale, string> }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: paths[locale], languages: languageAlternates(paths) },
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description,
      url: paths[locale],
      locale: ogLocale[locale],
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  };
}
