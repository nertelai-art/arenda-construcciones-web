import type { Locale } from "@/lib/i18n";
import { ca, type Dictionary } from "./ca";
import { en } from "./en";
import { es } from "./es";

const dictionaries: Record<Locale, Dictionary> = { ca, es, en };

export const getDictionary = (locale: Locale) => dictionaries[locale];
export type { Dictionary };

/** Substitueix `{clau}` pel seu valor: `fill("Escriu-nos a {email}", { email })`. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
