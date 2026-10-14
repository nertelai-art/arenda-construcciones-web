"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Dictionary } from "@/content";
import { photos } from "@/content/photos";
import { useReducedMotion } from "../scroll/scroll-scene";
import { Brush } from "../ui/Brush";
import { ArrowRight } from "../ui/icons";
import styles from "./Works.module.css";

/**
 * Obres: a escriptori, la secció queda fixada i les fotos passen de dreta a esquerra mentre es
 * baixa. A mòbil (o amb moviment reduït) és una fila que es fa lliscar amb el dit.
 */
export function Works({ t }: { t: Dictionary["works"] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = section.current;
    const row = track.current;
    if (!element || !row) return;
    const wide = window.matchMedia("(min-width: 900px)");
    let travel = 0;
    let frame = 0;

    const measure = () => {
      const pinned = wide.matches && !reducedMotion;
      element.dataset.pinned = String(pinned);
      if (!pinned) {
        element.style.removeProperty("--height");
        row.style.transform = "";
        return;
      }
      travel = Math.max(0, row.scrollWidth - window.innerWidth);
      element.style.setProperty("--height", `${travel + window.innerHeight}px`);
      update();
    };
    const update = () => {
      frame = 0;
      if (element.dataset.pinned !== "true") return;
      const rect = element.getBoundingClientRect();
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      row.style.transform = `translate3d(${(-p * travel).toFixed(1)}px, 0, 0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    wide.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <section ref={section} id="obres" className={`carbo ${styles.section}`} aria-labelledby="obres-titol" data-pinned="false">
      <div className={styles.sticky}>
        <div ref={track} className={styles.track}>
          <header className={styles.intro}>
            <p className="kicker">{t.kicker}</p>
            <h2 id="obres-titol" className="h2">
              {t.title}
            </h2>
            <Brush color="groc" variant={0} className={styles.brush} />
            <p className="lead">{t.lead}</p>
            <p className={styles.hint} aria-hidden="true">
              {t.hint}
              <ArrowRight />
            </p>
          </header>

          {t.items.map((item, index) => {
            const photo = photos[item.photo];
            const portrait = photo.height / photo.width > 0.72;
            return (
              <figure key={item.title} className={styles.item} data-shape={portrait ? "tall" : "wide"}>
                <div className={styles.frame}>
                  <Image src={photo.src} alt={item.alt} width={photo.width} height={photo.height} sizes="(min-width: 900px) 60vw, 86vw" className={styles.photo} />
                </div>
                <figcaption className={styles.caption}>
                  <span className={styles.index}>
                    {String(index + 1).padStart(2, "0")} / {String(t.items.length).padStart(2, "0")}
                  </span>
                  <span className={styles.tag}>{item.tag}</span>
                  <span className={styles.title}>{item.title}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <span className={styles.progress} aria-hidden="true">
          <span ref={bar} />
        </span>
      </div>
    </section>
  );
}
