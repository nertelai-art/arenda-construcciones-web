"use client";

import { useRef } from "react";
import type { Dictionary } from "@/content";
import { useViewportProgress } from "../scroll/scroll-scene";
import { Brush } from "../ui/Brush";
import styles from "./Remote.module.css";

/**
 * «Com treballem»: els quatre passos sobre una línia de pinzell que es pinta a mesura que es
 * baixa, i el que inclou cada projecte. El progrés es toca al DOM, mai amb estat de React.
 */
export function Remote({ t }: { t: Dictionary["remote"] }) {
  const track = useRef<HTMLOListElement>(null);
  useViewportProgress(track, (value) => {
    const element = track.current;
    if (!element) return;
    element.style.setProperty("--fill", value.toFixed(4));
    const items = element.children;
    for (let index = 0; index < items.length; index++) {
      const reached = value >= (index + 0.35) / items.length || value >= 0.999;
      (items[index] as HTMLElement).dataset.reached = String(reached);
    }
  }, { start: 0.8, end: 0.45 });

  return (
    <section id="com-treballem" className={`section stone ${styles.section}`} aria-labelledby="com-treballem-titol">
      <div className={`container ${styles.layout}`}>
        <header className={styles.head}>
          <p className="kicker" data-reveal>
            {t.kicker}
          </p>
          <h2 id="com-treballem-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          <p className="lead" data-reveal style={{ ["--i" as string]: 2 }}>
            {t.lead}
          </p>
        </header>

        <ol ref={track} className={styles.steps}>
          {t.steps.map((step, index) => (
            <li key={step.title} data-reached="false">
              <span className={styles.dot} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="container">
        <div className={styles.includedHead}>
          <h3 className={styles.includedTitle} data-reveal>
            {t.includedTitle}
          </h3>
          <Brush color="vermell" variant={1} reveal className={styles.includedBrush} />
        </div>
        <ul className={styles.included}>
          {t.included.map((item, index) => (
            <li key={item.title} data-reveal style={{ ["--i" as string]: index % 3 }}>
              <span className={styles.count} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
