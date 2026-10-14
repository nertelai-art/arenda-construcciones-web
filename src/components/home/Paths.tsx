import Image from "next/image";
import type { Dictionary } from "@/content";
import { photos, type PhotoKey } from "@/content/photos";
import { Brush, type BrushColor } from "../ui/Brush";
import { ArrowRight, Check } from "../ui/icons";
import styles from "./Paths.module.css";

/** «Què fem»: les dues portes d'entrada, obra nova i reformes, cadascuna amb la seva foto. */
export function Paths({ t }: { t: Dictionary["paths"] }) {
  const cards: { key: string; data: typeof t.newBuild; photo: PhotoKey; href: string; color: BrushColor }[] = [
    { key: "new", data: t.newBuild, photo: "roofSite", href: "#obra-nova", color: "blau" },
    { key: "renovation", data: t.renovation, photo: "bathroom", href: "#reformes", color: "groc" },
  ];
  return (
    <section id="que-fem" className={`section ${styles.section}`} aria-labelledby="que-fem-titol">
      <div className="container">
        <header className={styles.head}>
          <p className="kicker" data-reveal>
            {t.kicker}
          </p>
          <h2 id="que-fem-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
        </header>

        <div className={styles.grid}>
          {cards.map((card, index) => {
            const photo = photos[card.photo];
            return (
              <article key={card.key} className={styles.card} data-index={index}>
                <div className={styles.media} data-reveal="wipe">
                  <Image src={photo.src} alt={card.data.imageAlt} width={photo.width} height={photo.height} sizes="(min-width: 960px) 46vw, 100vw" className={styles.photo} />
                  <span className={styles.number} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className={styles.body}>
                  <p className={styles.label} data-reveal>
                    {card.data.label}
                  </p>
                  <h3 className={styles.title} data-reveal style={{ ["--i" as string]: 1 }}>
                    {card.data.title}
                  </h3>
                  <Brush color={card.color} variant={index === 0 ? 1 : 2} reveal className={styles.brush} />
                  <p className={styles.text} data-reveal style={{ ["--i" as string]: 2 }}>
                    {card.data.text}
                  </p>
                  <ul className={styles.items}>
                    {card.data.items.map((item, position) => (
                      <li key={item} data-reveal style={{ ["--i" as string]: 3 + position }}>
                        <Check />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href={card.href} className="link-arrow">
                    {card.data.link}
                    <ArrowRight />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
