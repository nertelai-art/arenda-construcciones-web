import { BathShowcase } from "@/components/bath/BathShowcase";
import { Contact } from "@/components/home/Contact";
import { Faq } from "@/components/home/Faq";
import { GoodToKnow } from "@/components/home/GoodToKnow";
import { Hero } from "@/components/home/Hero";
import { Numbers } from "@/components/home/Numbers";
import { Paths } from "@/components/home/Paths";
import { Remote } from "@/components/home/Remote";
import { Team } from "@/components/home/Team";
import { Works } from "@/components/home/Works";
import { VillaShowcase } from "@/components/villa/VillaShowcase";
import { getDictionary } from "@/content";
import { homePath, type Locale } from "@/lib/i18n";
import { pageMetadata } from "./metadata";

export function homeMetadata(locale: Locale) {
  const t = getDictionary(locale);
  return pageMetadata({ locale, title: t.meta.title, description: t.meta.description, paths: homePath });
}

/**
 * La portada: una sola acció (demanar la primera visita). Ordre: promesa, les dues portes
 * (obra nova i reformes) amb la seva anatomia en 3D, com treballem a distància, obres, xifres,
 * equip, el que cal saber, preguntes i contacte.
 */
export function HomeView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <>
      <Hero t={t.hero} />
      <Paths t={t.paths} />
      <VillaShowcase t={t.anatomy} />
      <BathShowcase t={t.renovation} />
      <Remote t={t.remote} />
      <Works t={t.works} />
      <Numbers t={t.numbers} locale={locale} />
      <Team t={t.team} />
      <GoodToKnow t={t.goodToKnow} />
      <Faq t={t.faq} />
      <Contact t={t.contact} locale={locale} whatsappMessage={t.hero.whatsappMessage} />
    </>
  );
}
