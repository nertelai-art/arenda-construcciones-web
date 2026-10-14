"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/content";
import { homeAnchor, homePath, type Locale } from "@/lib/i18n";
import { Brush } from "../ui/Brush";
import { Close, Menu } from "../ui/icons";
import styles from "./Header.module.css";
import { LanguageMenu } from "./LanguageMenu";
import { Logo } from "./Logo";

type Props = { locale: Locale; t: Dictionary["nav"] };

export function Header({ locale, t }: Props) {
  const header = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const home = homePath[locale];
  // A la portada, la capçalera és transparent damunt la foto fins que es baixa.
  const overHero = pathname === home;
  const anchor = (hash: `#${string}`) => (overHero ? hash : homeAnchor(locale, hash));

  // Opaca quan la foto de capçalera ja ha passat: es toca el DOM, sense re-renderitzar.
  useEffect(() => {
    const element = header.current;
    if (!element || !overHero) return;
    const update = () => {
      const solid = window.scrollY > window.innerHeight * 0.72;
      if (element.dataset.solid !== String(solid)) element.dataset.solid = String(solid);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [overHero]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    // Si l'Esc ja l'ha fet servir el desplegable d'idioma, el menú queda obert.
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !event.defaultPrevented && close();
    document.addEventListener("keydown", onKey);
    document.documentElement.dataset.menu = "open";
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.documentElement.dataset.menu;
    };
  }, [open, close]);

  return (
    <header ref={header} className={styles.header} data-solid={overHero ? "false" : "true"} data-open={open || undefined}>
      <div className={`container ${styles.bar}`}>
        <Link href={home} className={styles.brand} onClick={close}>
          <Logo onDark className={styles.logoDark} />
          <Logo className={styles.logoLight} />
          <span className="sr-only">{t.home}</span>
        </Link>

        <nav aria-label={t.menu} className={styles.nav}>
          <ul>
            {t.items.map((item) => (
              <li key={item.href}>
                <a href={anchor(item.href as `#${string}`)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.tools}>
          <LanguageMenu locale={locale} pathname={pathname} label={t.language} />
          <a href={anchor("#contacte")} className={`btn ${styles.cta}`}>
            {t.cta}
          </a>
          <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls="menu-mobil" onClick={() => setOpen((value) => !value)}>
            {open ? <Close /> : <Menu />}
            <span className="sr-only">{open ? t.close : t.menu}</span>
          </button>
        </div>
      </div>

      <div id="menu-mobil" className={`dark ${styles.panel}`} hidden={!open}>
        <nav aria-label={t.menu} className="container">
          <ul className={styles.panelList}>
            {t.items.map((item, index) => (
              <li key={item.href} style={{ ["--i" as string]: index }}>
                <a href={anchor(item.href as `#${string}`)} onClick={close}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <Brush color="vermell" variant={1} className={styles.panelBrush} />
          <a href={anchor("#contacte")} className="btn" onClick={close}>
            {t.cta}
          </a>
        </nav>
      </div>
    </header>
  );
}
