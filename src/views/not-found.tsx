import Link from "next/link";
import { Brush } from "@/components/ui/Brush";
import { getDictionary } from "@/content";
import { homePath, type Locale } from "@/lib/i18n";
import styles from "./legal.module.css";

export function NotFoundView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).notFound;
  return (
    <article className={`container ${styles.page}`}>
      <p className="kicker">404</p>
      <h1 className={styles.title}>{t.title}</h1>
      <Brush color="blau" variant={1} className={styles.brush} />
      <p className={styles.updated}>{t.text}</p>
      <p style={{ marginTop: 32 }}>
        <Link href={homePath[locale]} className="btn">
          {t.back}
        </Link>
      </p>
    </article>
  );
}
