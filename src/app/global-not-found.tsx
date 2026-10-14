import type { Metadata } from "next";
import { RootShell } from "@/components/site/RootShell";
import { deploymentUrl } from "@/lib/deployment";
import { defaultLocale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { NotFoundView } from "@/views/not-found";

// Amb un layout arrel per idioma, les URL que no coincideixen amb cap cauen aquí.
export const metadata: Metadata = { metadataBase: new URL(deploymentUrl()), title: `404 · ${site.name}`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <RootShell locale={defaultLocale}>
      <NotFoundView locale={defaultLocale} />
    </RootShell>
  );
}
