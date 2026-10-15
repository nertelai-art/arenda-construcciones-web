"use client";

// Insígnia discreta «Demo · Nertel» a la cantonada. Només surt a qui ha entrat amb un enllaç
// personal: quan la web passa a ser la del client (sense porta), desapareix sola. Estils en línia
// perquè funcione igual a totes les webs; si tapa alguna cosa, es mou amb `--nertel-demo-bottom`.

import { useSyncExternalStore, type CSSProperties } from "react";
import { nertelUrl, type BlockedLocale } from "./blocked";
import { parseLeadCookie } from "./names";

const noop = () => () => {};
const hasLead = () => parseLeadCookie(document.cookie) !== null;

const label: Record<BlockedLocale, string> = { ca: "Demo feta per Nertel", es: "Demo hecha por Nertel" };

const style: CSSProperties = {
  position: "fixed",
  left: 12,
  bottom: "var(--nertel-demo-bottom, 12px)",
  zIndex: 70,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 11px",
  borderRadius: 999,
  background: "rgba(32, 40, 60, 0.92)",
  color: "#fff",
  font: "500 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif",
  letterSpacing: "0.01em",
  textDecoration: "none",
  boxShadow: "0 8px 24px -12px rgba(0, 0, 0, 0.5)",
};

export function DemoBadge({ site, locale = "ca" }: { site: string; locale?: BlockedLocale }) {
  const visible = useSyncExternalStore(noop, hasLead, () => false);
  if (!visible) return null;
  return (
    <a href={nertelUrl(locale, site, "insignia")} target="_blank" rel="noopener" style={style}>
      {label[locale]} <span aria-hidden="true">↗</span>
    </a>
  );
}
