"use client";

// Secció alta amb un escenari sticky: text HTML real a sobre i el canvas darrere. No importa
// three.js: l'escena es carrega amb next/dynamic quan la secció és a prop.

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";
import type { Dictionary } from "@/content";
import { photos } from "@/content/photos";
import { useNearViewport, useReducedMotion, useRenderMode, useScrollProgress } from "../scroll/scroll-scene";
import { Brush } from "../ui/Brush";
import { duskAt, paperToGroundAt, stepAt } from "./villa-phases";
import styles from "./VillaShowcase.module.css";

const VillaScene = dynamic(() => import("./VillaScene"), { ssr: false });

const two = (value: number) => String(value).padStart(2, "0");

export function VillaShowcase({ t }: { t: Dictionary["anatomy"] }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const mode = useRenderMode();
  const reducedMotion = useReducedMotion();
  const near = useNearViewport(section);
  const last = t.steps.length - 1;

  // Pas actiu, comptador, barra i cel: directament al DOM, mai amb setState (canvia a cada píxel).
  const progress = useScrollProgress(section, (raw) => {
    const value = reducedMotion ? 1 : raw;
    const active = stepAt(value);
    const items = steps.current?.children ?? [];
    for (let index = 0; index < items.length; index++) {
      (items[index] as HTMLElement).dataset.state = index < active ? "done" : index === active ? "active" : "todo";
    }
    if (counter.current) counter.current.textContent = two(active + 1);
    if (bar.current) bar.current.style.transform = `scaleX(${value.toFixed(4)})`;
    if (stage.current) {
      const dusk = duskAt(value);
      stage.current.style.setProperty("--paper", (1 - paperToGroundAt(value)).toFixed(3));
      stage.current.style.setProperty("--dusk", dusk.toFixed(3));
      stage.current.dataset.dark = dusk > 0.55 ? "true" : "false";
    }
  });

  // Al servidor («pending») es reserva el recorregut sencer: així no hi ha salt en hidratar.
  const compact = mode === "static";
  const initial = reducedMotion ? last : 0;

  return (
    <section ref={section} id="obra-nova" aria-labelledby="obra-nova-titol" className={styles.section} data-track data-compact={compact || undefined} data-still={reducedMotion || undefined}>
      <div ref={stage} className={styles.stage} data-dark="false">
        <div className={styles.sky} aria-hidden="true">
          <span className={styles.day} />
          <span className={styles.paper} />
          <span className={styles.dusk} />
        </div>

        {mode === "3d" && near && (
          <div className={styles.canvas}>
            <VillaScene progress={progress} reducedMotion={reducedMotion} />
          </div>
        )}

        {/* Vel·ladura darrere del text: clara de dia i fosca al capvespre. */}
        <div className={styles.scrim} aria-hidden="true">
          <span className={styles.scrimLight} />
          <span className={styles.scrimDark} />
        </div>

        <div className={`container ${styles.content}`}>
          <div className={styles.copy}>
            <header className={styles.head}>
              <p className="kicker">{t.kicker}</p>
              <h2 id="obra-nova-titol" className={styles.title}>
                {t.title}
              </h2>
              <Brush color="blau" variant={1} className={styles.brush} />
              <p className={styles.lead}>{t.lead}</p>
            </header>

            <ol ref={steps} className={styles.steps}>
              {t.steps.map((step, index) => (
                <li key={step.title} data-state={index < initial ? "done" : index === initial ? "active" : "todo"}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {two(index + 1)}
                  </span>
                  <div className={styles.stepBody}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepText}>{step.text}</p>
                    {index === 3 && (
                      <ul className={styles.legend}>
                        {t.legend.map((item) => (
                          <li key={item.key} data-key={item.key}>
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Sense WebGL: la foto d'una vila acabada, després dels passos. */}
        {compact && (
          <div className={`container ${styles.fallback}`}>
            <Image src={photos.villaPool.src} alt={t.staticAlt} width={photos.villaPool.width} height={photos.villaPool.height} sizes="100vw" className={styles.fallbackPhoto} />
          </div>
        )}

        <div className={styles.footer} aria-hidden="true">
          <span className={styles.count}>
            <span ref={counter}>{two(initial + 1)}</span> / {two(t.steps.length)}
          </span>
          <span className={styles.track}>
            <span ref={bar} />
          </span>
        </div>
        <p className={styles.note}>{t.note}</p>
        <p className="sr-only">{t.sr}</p>
      </div>
    </section>
  );
}
