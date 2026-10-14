import { describe, expect, it } from "vitest";
import { businessJsonLd, faqJsonLd } from "./seo";

describe("businessJsonLd", () => {
  const data = businessJsonLd("Descripció", "https://exemple.test");

  it("és una constructora amb les dades fiscals i de contacte del web actual", () => {
    expect(data["@type"]).toBe("GeneralContractor");
    expect(data.legalName).toBe("Arenda Construcciones 2003 S.L.");
    expect(data.taxID).toBe("B-17729963");
    expect(data.telephone).toBe("+34972653955");
    expect(data.address.postalCode).toBe("17252");
  });

  it("l'horari surt en el format de schema.org", () => {
    expect(data.openingHoursSpecification[0]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Tuesday", "https://schema.org/Wednesday", "https://schema.org/Thursday", "https://schema.org/Friday"],
      opens: "08:30",
      closes: "18:00",
    });
    expect(data.openingHoursSpecification[1]?.dayOfWeek).toEqual(["https://schema.org/Saturday"]);
  });

  it("les adreces absolutes surten de l'URL del desplegament", () => {
    expect(data.logo).toBe("https://exemple.test/brand/logo-arenda.png");
    expect(data["@id"]).toBe("https://exemple.test/#negoci");
  });
});

describe("faqJsonLd", () => {
  it("cada pregunta porta la seva resposta", () => {
    const data = faqJsonLd([{ q: "Pregunta?", a: "Resposta." }]);
    expect(data.mainEntity).toEqual([{ "@type": "Question", name: "Pregunta?", acceptedAnswer: { "@type": "Answer", text: "Resposta." } }]);
  });
});
