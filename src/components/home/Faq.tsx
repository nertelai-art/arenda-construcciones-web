import type { Dictionary } from "@/content";
import { faqJsonLd } from "@/lib/seo";
import { JsonLd } from "../site/JsonLd";
import { Plus } from "../ui/icons";
import styles from "./Faq.module.css";

/** Preguntes freqüents amb <details>: funcionen sense JavaScript i les llegeixen els cercadors. */
export function Faq({ t }: { t: Dictionary["faq"] }) {
  return (
    <section id="preguntes" className={`section ${styles.section}`} aria-labelledby="preguntes-titol">
      <JsonLd data={faqJsonLd(t.items)} />
      <div className={`container ${styles.layout}`}>
        <header className={styles.head}>
          <p className="kicker" data-reveal>
            {t.kicker}
          </p>
          <h2 id="preguntes-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
        </header>
        <div className={styles.list}>
          {t.items.map((item, index) => (
            <details key={item.q} className={styles.item} data-reveal style={{ ["--i" as string]: index % 3 }} name="faq">
              <summary>
                <span>{item.q}</span>
                <Plus />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
