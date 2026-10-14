import { describe, expect, it } from "vitest";
import { contactMailto, validateContact, type ContactRequest } from "./contact";

const valid: ContactRequest = {
  name: "Anna Puig",
  email: "anna@exemple.com",
  phone: "",
  town: "Calonge",
  type: "renovation",
  message: "Volem refer la cuina i dos banys a la tardor.",
  privacy: true,
};

describe("validateContact", () => {
  it("una sol·licitud completa no té errors", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("marca cada camp obligatori que falta", () => {
    expect(validateContact({ ...valid, name: " ", email: "anna@", message: "hola", privacy: false })).toEqual({ name: true, email: true, message: true, privacy: true });
  });

  it("accepta adreces amb subdominis i signes habituals", () => {
    expect(validateContact({ ...valid, email: "jan.de-vries+obra@mail.example.nl" })).toEqual({});
  });

  it("rebutja adreces sense domini complet o amb espais", () => {
    for (const email of ["anna@exemple", "anna exemple@x.com", "@exemple.com", "anna@exemple.c"]) {
      expect(validateContact({ ...valid, email }).email, email).toBe(true);
    }
  });
});

describe("contactMailto", () => {
  const labels = { name: "Nom", email: "Correu", phone: "Telèfon", town: "Zona", type: "Tipus" };

  it("posa l'assumpte i les dades al cos, codificats", () => {
    const url = contactMailto("info@quality-constructions.com", valid, { subject: "Projecte · Anna Puig", labels, typeLabel: "Reforma" });
    expect(url.startsWith("mailto:info@quality-constructions.com?subject=Projecte%20%C2%B7%20Anna%20Puig&body=")).toBe(true);
    const body = decodeURIComponent(url.split("&body=")[1]!);
    expect(body).toBe("Nom: Anna Puig\nCorreu: anna@exemple.com\nZona: Calonge\nTipus: Reforma\n\nVolem refer la cuina i dos banys a la tardor.");
  });

  it("no hi posa les línies dels camps opcionals buits", () => {
    const url = contactMailto("a@b.cat", { ...valid, town: "", phone: "  " }, { subject: "x", labels, typeLabel: "" });
    const body = decodeURIComponent(url.split("&body=")[1]!);
    expect(body).not.toContain("Telèfon");
    expect(body).not.toContain("Zona");
    expect(body).not.toContain("Tipus");
  });

  it("un & o un ? del missatge no trenquen l'enllaç", () => {
    const url = contactMailto("a@b.cat", { ...valid, message: "Cuina & bany? Sí, tots dos." }, { subject: "x", labels, typeLabel: "" });
    expect(url.match(/&/g)).toHaveLength(1);
    expect(decodeURIComponent(url.split("&body=")[1]!)).toContain("Cuina & bany? Sí, tots dos.");
  });
});
