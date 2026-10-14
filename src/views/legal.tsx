import Link from "next/link";
import { Brush } from "@/components/ui/Brush";
import { getDictionary } from "@/content";
import { homePath, legalPath, type Locale } from "@/lib/i18n";
import { pageMetadata } from "./metadata";
import styles from "./legal.module.css";

export function legalMetadata(locale: Locale) {
  const t = getDictionary(locale);
  return pageMetadata({ locale, title: t.legal.metaTitle, description: t.legal.sections[0]!.body[0]!, paths: legalPath });
}

export function LegalView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).legal;
  return (
    <article className={`container ${styles.page}`}>
      <h1 className={styles.title}>{t.title}</h1>
      <Brush color="vermell" variant={0} className={styles.brush} />
      <p className={styles.updated}>{t.updated}</p>
      {t.sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2>{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <Link href={homePath[locale]} className="link-arrow">
        {t.back}
      </Link>
    </article>
  );
}
