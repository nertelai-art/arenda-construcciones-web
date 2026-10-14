import type { Dictionary } from "@/content";
import styles from "./GoodToKnow.module.css";

/** «Bo de saber»: franja blava del logotip amb la quadrícula d'un plànol. */
export function GoodToKnow({ t }: { t: Dictionary["goodToKnow"] }) {
  return (
    <section className={`section roof ${styles.section}`} aria-labelledby="bo-de-saber-titol">
      <div className="container">
        <p className={`kicker ${styles.kicker}`} data-reveal>
          {t.kicker}
        </p>
        <h2 id="bo-de-saber-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
          {t.title}
        </h2>
        <ol className={styles.list}>
          {t.items.map((item, index) => (
            <li key={item.title} data-reveal style={{ ["--i" as string]: index }}>
              <span className={styles.mark} aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
