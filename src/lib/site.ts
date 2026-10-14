/**
 * Dades del negoci. Tot surt del web actual (quality-constructions.com) o del web del grup
 * (quality-estates.com), que comparteix CIF i oficina. El que falta per confirmar, a CLAUDE.md.
 */
export const site = {
  name: "Arenda Construcciones",
  brand: "Quality Constructions",
  legalName: "Arenda Construcciones 2003 S.L.",
  taxId: "B-17729963",
  url: "https://quality-constructions.com",
  slogan: "Converting dreams into reality",
  phone: { display: "+34 972 653 955", e164: "+34972653955" },
  whatsapp: { display: "+34 615 48 48 77", e164: "34615484877" },
  email: "info@quality-constructions.com",
  address: {
    street: "Avinguda Catalunya 8, Local 3",
    postalCode: "17252",
    locality: "Sant Antoni de Calonge",
    region: "Girona",
    country: "ES",
  },
  mapsUrl: "https://goo.gl/maps/z2gVYMuSAcromBkk7",
  social: {
    facebook: "https://www.facebook.com/qe.costabrava",
    instagram: "https://www.instagram.com/quality_estates/",
  },
  group: {
    estates: "https://quality-estates.com/",
    renting: "https://quality-renting.com/",
  },
  /** Horari de l'oficina de Sant Antoni (web del grup). Dies: 1 = dilluns … 6 = dissabte. */
  openingHours: [
    { days: [1, 2, 3, 4, 5], opens: "08:30", closes: "18:00" },
    { days: [6], opens: "09:00", closes: "14:00" },
  ],
} as const;

/** Enllaç de WhatsApp amb un missatge ja escrit. */
export function whatsappUrl(text?: string) {
  const base = `https://wa.me/${site.whatsapp.e164}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
