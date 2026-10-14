"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Dictionary } from "@/content";
import { photos } from "@/content/photos";
import { site, whatsappUrl } from "@/lib/site";
import { Brush } from "../ui/Brush";
import { ArrowDown, ArrowRight, WhatsApp } from "../ui/icons";
import styles from "./Hero.module.css";

/** Les dues últimes paraules del titular van subratllades amb el traç vermell («Costa Brava.»). */
function splitTail(line: string) {
  const words = line.split(" ");
  return [words.slice(0, -2).join(" "), words.slice(-2).join(" ")] as const;
}

export function Hero({ t }: { t: Dictionary["hero"] }) {
  const section = useRef<HTMLElement>(null);
  const [first = "", second = ""] = t.titleLines;
  const [head, tail] = splitTail(second);

  // Mentre es baixa, la foto s'allunya i el text puja: una variable CSS, sense re-renderitzar.
  useEffect(() => {
    const element = section.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / element.offsetHeight));
      element.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={section} className={`dark ${styles.hero}`} aria-labelledby="hero-titol">
      <div className={styles.media}>
        <Image src={photos.villaPool.src} alt={t.imageAlt} fill priority sizes="100vw" className={styles.photo} />
      </div>
      <div className={styles.shade} aria-hidden="true" />

      <div className={`container ${styles.content}`}>
        <p className={`kicker ${styles.kicker}`}>{t.kicker}</p>
        <h1 id="hero-titol" className={styles.title}>
          <span className={styles.line}>
            <span>{first}</span>
          </span>{" "}
          <span className={styles.line}>
            <span>
              {head}{" "}
              <span className={styles.tail}>
                {tail}
                <Brush color="vermell" variant={0} className={styles.underline} />
              </span>
            </span>
          </span>
        </h1>

        <p className={styles.lead}>{t.lead}</p>

        <div className={styles.actions}>
          <a href="#contacte" className="btn">
            {t.primary}
            <ArrowRight />
          </a>
          <a href={whatsappUrl(t.whatsappMessage)} className="btn btn--ghost" rel="noopener" target="_blank">
            <WhatsApp />
            {t.whatsapp}
          </a>
          <span className={styles.note}>{t.primaryNote}</span>
        </div>

        <ul className={styles.proofs}>
          {t.proofs.map((proof) => (
            <li key={proof}>{proof}</li>
          ))}
        </ul>
      </div>

      <p className={styles.slogan} aria-hidden="true">
        {site.slogan}
      </p>
      <a href="#que-fem" className={styles.scroll}>
        <span>{t.scroll}</span>
        <ArrowDown />
      </a>
    </section>
  );
}
