import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RootShell } from "@/components/site/RootShell";
import { deploymentUrl, isIndexable } from "@/lib/deployment";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(deploymentUrl()),
  robots: isIndexable() ? undefined : { index: false, follow: false },
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#302729" };

export default function Layout({ children }: { children: ReactNode }) {
  return <RootShell locale="es">{children}</RootShell>;
}
