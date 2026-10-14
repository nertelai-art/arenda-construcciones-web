import Image from "next/image";
import type { Dictionary } from "@/content";
import { photos } from "@/content/photos";
import { site } from "@/lib/site";
import { ArrowRight, Pin } from "../ui/icons";
import styles from "./Team.module.css";

/** «Qui som»: la foto de l'equip al showroom, el text i el grup. */
export function Team({ t }: { t: Dictionary["team"] }) {
  const photo = photos.team;
  return (
    <section id="qui-som" className={`section ${styles.section}`} aria-labelledby="qui-som-titol">
      <div className={`container ${styles.layout}`}>
        <div className={styles.media} data-reveal="wipe">
          <Image src={photo.src} alt={t.imageAlt} width={photo.width} height={photo.height} sizes="(min-width: 960px) 52vw, 100vw" className={styles.photo} />
        </div>

        <div className={styles.copy}>
          <p className="kicker" data-reveal>
            {t.kicker}
          </p>
          <h2 id="qui-som-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          {t.paragraphs.map((paragraph, index) => (
            <p key={paragraph} className={styles.paragraph} data-reveal style={{ ["--i" as string]: 2 + index }}>
              {paragraph}
            </p>
          ))}
          <p className={styles.area} data-reveal style={{ ["--i" as string]: 4 }}>
            <Pin />
            {t.area}
          </p>

          <div className={styles.group} data-reveal style={{ ["--i" as string]: 5 }}>
            <p className={styles.groupTitle}>{t.groupTitle}</p>
            <ul>
              {t.group.map((item) => (
                <li key={item.name}>
                  <a href={site.group[item.href as keyof typeof site.group]} rel="noopener" target="_blank">
                    <strong>{item.name}</strong>
                    <span>{item.text}</span>
                    <ArrowRight />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
