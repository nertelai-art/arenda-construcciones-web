"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { alternatePath, locales, type Locale } from "@/lib/i18n";
import { Check, ChevronDown, Globe } from "../ui/icons";
import styles from "./LanguageMenu.module.css";

const names: Record<Locale, string> = { ca: "Català", es: "Español", en: "English" };

/**
 * Selector d'idioma desplegable: un botó amb l'idioma actual que obre la llista dels tres. Cada
 * opció és un enllaç a la mateixa pàgina en aquell idioma. Es tanca amb Esc (tornant el focus al
 * botó), clicant fora o sortint-ne amb el tabulador; les fletxes recorren les opcions.
 */
export function LanguageMenu({ locale, pathname, label }: { locale: Locale; pathname: string; label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  // Clicar fora tanca el desplegable.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const links = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      // La llista apareix en el render següent.
      requestAnimationFrame(() => links()[locales.indexOf(locale)]?.focus());
      return;
    }
    const items = links();
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div
      ref={root}
      className={styles.menu}
      data-open={open || undefined}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (open && !root.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${names[locale]}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe className={styles.globe} />
        <span className={styles.code}>{locale.toUpperCase()}</span>
        <ChevronDown className={styles.chevron} />
      </button>

      <ul ref={list} id={id} className={styles.list} hidden={!open} aria-label={label}>
        {locales.map((code) => {
          const current = code === locale;
          return (
            <li key={code}>
              <Link
                href={alternatePath(pathname, code)}
                hrefLang={code}
                lang={code}
                aria-current={current ? "page" : undefined}
                className={styles.option}
                onClick={() => close()}
              >
                <span className={styles.optionCode}>{code.toUpperCase()}</span>
                <span className={styles.optionName}>{names[code]}</span>
                {current && <Check className={styles.check} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
