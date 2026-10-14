"use client";

// Reforma pas a pas: escenari sticky amb el bany en 3D i, després, la foto del bany de debò.

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";
import type { Dictionary } from "@/content";
import { photos } from "@/content/photos";
import { useNearViewport, useReducedMotion, useRenderMode, useScrollProgress } from "../scroll/scroll-scene";
import { Brush } from "../ui/Brush";
import { glowAt, stepAt } from "./bath-phases";
import styles from "./BathShowcase.module.css";

const BathScene = dynamic(() => import("./BathScene"), { ssr: false });

const two = (value: number) => String(value).padStart(2, "0");

export function BathShowcase({ t }: { t: Dictionary["renovation"] }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const mode = useRenderMode();
  const reducedMotion = useReducedMotion();
  const near = useNearViewport(track, "1500px", 3500);
  const last = t.steps.length - 1;

  const progress = useScrollProgress(track, (raw) => {
    const value = reducedMotion ? 1 : raw;
    const active = stepAt(value);
    const items = steps.current?.children ?? [];
    for (let index = 0; index < items.length; index++) {
      (items[index] as HTMLElement).dataset.state = index < active ? "done" : index === active ? "active" : "todo";
    }
    if (counter.current) counter.current.textContent = two(active + 1);
    if (bar.current) bar.current.style.transform = `scaleX(${value.toFixed(4)})`;
    stage.current?.style.setProperty("--glow", glowAt(value).toFixed(3));
  });

  const compact = mode === "static";
  const initial = reducedMotion ? last : 0;
  const photo = photos.bathroom;

  return (
    <section id="reformes" aria-labelledby="reformes-titol" className={`carbo ${styles.section}`} data-compact={compact || undefined} data-still={reducedMotion || undefined}>
      <div ref={track} className={styles.track} data-track>
        <div ref={stage} className={styles.stage}>
          <div className={styles.light} aria-hidden="true" />
          {mode === "3d" && near && (
            <div className={styles.canvas}>
              <BathScene progress={progress} reducedMotion={reducedMotion} />
            </div>
          )}

          <div className={styles.scrim} aria-hidden="true" />

          <div className={`container ${styles.content}`}>
            <div className={styles.copy}>
              <header className={styles.head}>
                <p className="kicker">{t.kicker}</p>
                <h2 id="reformes-titol" className={styles.title}>
                  {t.title}
                </h2>
                <Brush color="groc" variant={2} className={styles.brush} />
                <p className={styles.lead}>{t.lead}</p>
              </header>
              <ol ref={steps} className={styles.steps}>
                {t.steps.map((step, index) => (
                  <li key={step.title} data-state={index < initial ? "done" : index === initial ? "active" : "todo"}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {two(index + 1)}
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepText}>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className={styles.footer} aria-hidden="true">
            <span className={styles.count}>
              <span ref={counter}>{two(initial + 1)}</span> / {two(t.steps.length)}
            </span>
            <span className={styles.bar}>
              <span ref={bar} />
            </span>
          </div>
          <p className="sr-only">{t.sr}</p>
        </div>
      </div>

      <div className={`container ${styles.result}`}>
        <div className={styles.resultPhoto} data-reveal="wipe">
          <Image src={photo.src} alt={t.resultAlt} width={photo.width} height={photo.height} sizes="(min-width: 960px) 58vw, 100vw" className={styles.photo} />
        </div>
        <div className={styles.resultCopy}>
          <h3 className={styles.resultTitle} data-reveal>
            {t.resultTitle}
          </h3>
          <Brush color="vermell" variant={1} reveal className={styles.brush} />
          <p data-reveal style={{ ["--i" as string]: 1 }}>
            {t.resultText}
          </p>
        </div>
      </div>
    </section>
  );
}
