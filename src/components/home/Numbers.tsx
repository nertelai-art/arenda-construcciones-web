import type { Dictionary } from "@/content";
import type { Locale } from "@/lib/i18n";
import { Brush, type BrushColor } from "../ui/Brush";
import styles from "./Numbers.module.css";

const colors: BrushColor[] = ["blau", "groc", "vermell", "blau"];

/** Xifres grosses que compten des de zero quan entren (RevealObserver). Sense JS, el valor final. */
export function Numbers({ t, locale }: { t: Dictionary["numbers"]; locale: Locale }) {
  const format = new Intl.NumberFormat(locale);
  return (
    <section className={`section ${styles.section}`} aria-labelledby="xifres-titol">
      <div className="container">
        <h2 id="xifres-titol" className="sr-only">
          {t.title}
        </h2>
        <ul className={styles.grid}>
          {t.items.map((item, index) => (
            <li key={item.label} className={styles.item} data-reveal style={{ ["--i" as string]: index }}>
              <p className={styles.value}>
                {item.prefix && <span className={styles.prefix}>{item.prefix}</span>}
                <span data-count={item.value}>{format.format(item.value)}</span>
                {item.suffix}
              </p>
              <Brush color={colors[index % colors.length]!} variant={(index % 3) as 0 | 1 | 2} reveal index={index} className={styles.brush} />
              <p className={styles.label}>{item.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
