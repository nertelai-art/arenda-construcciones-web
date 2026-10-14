import { deploymentUrl } from "./deployment";
import { site } from "./site";

const schemaDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Dades estructurades del negoci (schema.org `GeneralContractor`). */
export function businessJsonLd(description: string, url = deploymentUrl()) {
  return {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    "@id": `${url}/#negoci`,
    name: site.name,
    alternateName: site.brand,
    legalName: site.legalName,
    slogan: site.slogan,
    description,
    url,
    logo: `${url}/brand/logo-arenda.png`,
    image: `${url}/og.jpg`,
    telephone: site.phone.e164,
    email: site.email,
    taxID: site.taxId,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      postalCode: site.address.postalCode,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    areaServed: ["Begur", "Palamós", "Calonge", "Sant Antoni de Calonge", "Platja d'Aro", "Santa Cristina d'Aro", "Sant Feliu de Guíxols"].map((name) => ({ "@type": "Place", name })),
    knowsLanguage: ["ca", "es", "en", "fr", "de", "nl"],
    openingHoursSpecification: site.openingHours.map(({ days, opens, closes }) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.map((day) => `https://schema.org/${schemaDays[day]}`),
      opens,
      closes,
    })),
    sameAs: Object.values(site.social),
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}
