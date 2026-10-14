/**
 * Sol·licitud de contacte. Encara no hi ha cap proveïdor d'enviament: es prepara un correu
 * (`mailto:`) amb tot escrit, que la persona envia des del seu programa. Quan n'hi hagi, aquesta
 * validació es reaprofita al servidor.
 */
export type ContactRequest = {
  name: string;
  email: string;
  phone: string;
  town: string;
  type: string;
  message: string;
  privacy: boolean;
};

export type ContactField = "name" | "email" | "message" | "privacy";
export type ContactErrors = Partial<Record<ContactField, true>>;

// Prou estricte per atrapar errades de teclejar, prou ampli per no rebutjar adreces vàlides.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {};
  if (request.name.trim().length < 2) errors.name = true;
  if (!EMAIL.test(request.email.trim())) errors.email = true;
  if (request.message.trim().length < 10) errors.message = true;
  if (!request.privacy) errors.privacy = true;
  return errors;
}

type Labels = { name: string; email: string; phone: string; town: string; type: string };

/** El correu ja escrit: assumpte i cos amb les dades, en l'idioma de la pàgina. */
export function contactMailto(to: string, request: ContactRequest, { subject, labels, typeLabel }: { subject: string; labels: Labels; typeLabel: string }) {
  const fields: [string, string][] = [
    [labels.name, request.name],
    [labels.email, request.email],
    [labels.phone, request.phone],
    [labels.town, request.town],
    [labels.type, typeLabel],
  ];
  const lines = fields.filter(([, value]) => value.trim() !== "").map(([label, value]) => `${label}: ${value.trim()}`);
  const body = [...lines, "", request.message.trim()].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
