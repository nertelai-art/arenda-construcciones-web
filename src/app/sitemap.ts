import type { MetadataRoute } from "next";
import { deploymentUrl } from "@/lib/deployment";
import { homePath, legalPath, locales, type Locale } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = deploymentUrl();
  const languages = (paths: Record<Locale, string>) => Object.fromEntries(locales.map((locale) => [locale, `${url}${paths[locale]}`]));
  return locales.flatMap((locale) => [
    { url: `${url}${homePath[locale]}`, changeFrequency: "monthly" as const, priority: 1, alternates: { languages: languages(homePath) } },
    { url: `${url}${legalPath[locale]}`, changeFrequency: "yearly" as const, priority: 0.2, alternates: { languages: languages(legalPath) } },
  ]);
}
