import type { Dictionary } from "@/content";
import { site, whatsappUrl } from "@/lib/site";
import { Phone, WhatsApp } from "../ui/icons";
import styles from "./MobileBar.module.css";

/** Barra fixa a peu de pantalla, només a mòbil: trucar, WhatsApp i demanar la visita. */
export function MobileBar({ t, whatsappMessage, contactHref }: { t: Dictionary["mobileBar"]; whatsappMessage: string; contactHref: string }) {
  return (
    <div className={styles.bar}>
      <a href={`tel:${site.phone.e164}`} className={styles.item}>
        <Phone />
        {t.call}
      </a>
      <a href={whatsappUrl(whatsappMessage)} className={styles.item} rel="noopener" target="_blank">
        <WhatsApp />
        {t.whatsapp}
      </a>
      <a href={contactHref} className={`${styles.item} ${styles.primary}`}>
        {t.visit}
      </a>
    </div>
  );
}
