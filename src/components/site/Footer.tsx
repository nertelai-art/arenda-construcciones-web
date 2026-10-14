import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/content";
import { homeAnchor, legalPath, type Locale } from "@/lib/i18n";
import { site, whatsappUrl } from "@/lib/site";
import { Brush } from "../ui/Brush";
import { Facebook, Instagram } from "../ui/icons";
import styles from "./Footer.module.css";
import { Logo } from "./Logo";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  // Any del copyright: es fixa a mà, no es llegeix del rellotge.
  const year = 2026;
  return (
    <footer className={`carbo ${styles.footer}`}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Logo onDark className={styles.logo} />
          <p>{t.footer.tagline}</p>
          <div className={styles.strokes} aria-hidden="true">
            <Brush color="blau" variant={0} />
            <Brush color="groc" variant={1} />
            <Brush color="vermell" variant={2} />
          </div>
        </div>

        <nav aria-label={t.footer.sections}>
          <h2 className={styles.heading}>{t.footer.sections}</h2>
          <ul className={styles.list}>
            {t.nav.items.map((item) => (
              <li key={item.href}>
                <a href={homeAnchor(locale, item.href as `#${string}`)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={styles.heading}>{t.footer.contact}</h2>
          <ul className={styles.list}>
            <li>
              <a href={`tel:${site.phone.e164}`}>{site.phone.display}</a>
            </li>
            <li>
              <a href={whatsappUrl()} rel="noopener" target="_blank">
                WhatsApp {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
            <li>
              <a href={site.mapsUrl} rel="noopener" target="_blank">
                {site.address.street}
                <br />
                {site.address.postalCode} {site.address.locality}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={styles.heading}>{t.footer.group}</h2>
          <ul className={styles.list}>
            {t.team.group.map((item) => (
              <li key={item.name}>
                <a href={site.group[item.href as keyof typeof site.group]} rel="noopener" target="_blank">
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
          <h2 className={styles.heading}>{t.footer.follow}</h2>
          <ul className={styles.social}>
            <li>
              <a href={site.social.instagram} rel="noopener" target="_blank" aria-label="Instagram">
                <Instagram />
              </a>
            </li>
            <li>
              <a href={site.social.facebook} rel="noopener" target="_blank" aria-label="Facebook">
                <Facebook />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={`container ${styles.kit}`}>
        <Image src="/brand/kit-digital.png" alt={t.footer.kitDigital} width={900} height={293} unoptimized className={styles.kitImage} />
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {year} {site.legalName} · CIF {site.taxId} · {t.footer.rights}
        </p>
        <Link href={legalPath[locale]}>{t.footer.legal}</Link>
      </div>
    </footer>
  );
}
