"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { fill, type Dictionary } from "@/content";
import { contactMailto, validateContact, type ContactErrors, type ContactField, type ContactRequest } from "@/lib/contact";
import { legalPath, type Locale } from "@/lib/i18n";
import { site, whatsappUrl } from "@/lib/site";
import { Brush } from "../ui/Brush";
import { ArrowRight, Clock, Mail, Phone, Pin, WhatsApp } from "../ui/icons";
import styles from "./Contact.module.css";

type Status = "idle" | "invalid" | "opened";

/** Formulari de contacte: valida al navegador i obre el correu ja escrit (encara no hi ha proveïdor). */
export function Contact({ t, locale, whatsappMessage }: { t: Dictionary["contact"]; locale: Locale; whatsappMessage: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const f = t.form;

  const read = (): ContactRequest => {
    const data = new FormData(form.current!);
    const text = (key: string) => String(data.get(key) ?? "");
    return { name: text("name"), email: text("email"), phone: text("phone"), town: text("town"), type: text("type"), message: text("message"), privacy: data.get("privacy") === "on" };
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const request = read();
    const found = validateContact(request);
    setErrors(found);
    const first = (["name", "email", "message", "privacy"] as ContactField[]).find((field) => found[field]);
    if (first) {
      setStatus("invalid");
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const typeLabel = f.types.find((option) => option.value === request.type)?.label ?? "";
    window.location.href = contactMailto(site.email, request, { subject: fill(f.subject, { name: request.name.trim() }), labels: f.labels, typeLabel });
    setStatus("opened");
  };

  // En corregir un camp, se'n treu l'error al moment (però no se'n posen de nous mentre s'escriu).
  const clear = (field: ContactField) => {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const fieldProps = (field: ContactField) => ({
    name: field,
    id: `contacte-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `contacte-${field}-error` : undefined,
    onInput: () => clear(field),
  });

  const error = (field: ContactField) =>
    errors[field] ? (
      <p id={`contacte-${field}-error`} className={styles.error}>
        {f.errors[field]}
      </p>
    ) : null;

  const [privacyBefore, privacyAfter] = f.privacy.split("{link}");

  return (
    <section id="contacte" className={`section dark roof ${styles.section}`} aria-labelledby="contacte-titol">
      <div className={`container ${styles.layout}`}>
        <div className={styles.intro}>
          <p className="kicker" data-reveal>
            {t.kicker}
          </p>
          <h2 id="contacte-titol" className="h2" data-reveal style={{ ["--i" as string]: 1 }}>
            {t.title}
          </h2>
          <Brush color="vermell" variant={0} reveal className={styles.brush} />
          <p className="lead" data-reveal style={{ ["--i" as string]: 2 }}>
            {t.lead}
          </p>

          <div className={styles.direct}>
            <h3 className={styles.directTitle}>{t.direct.title}</h3>
            <ul>
              <li>
                <Phone />
                <span>{t.direct.phone}</span>
                <a href={`tel:${site.phone.e164}`}>{site.phone.display}</a>
              </li>
              <li>
                <WhatsApp />
                <span>{t.direct.whatsapp}</span>
                <a href={whatsappUrl(whatsappMessage)} rel="noopener" target="_blank">
                  {site.whatsapp.display}
                </a>
              </li>
              <li>
                <Mail />
                <span>{t.direct.email}</span>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <Pin />
                <span>{t.direct.office}</span>
                <a href={site.mapsUrl} rel="noopener" target="_blank">
                  {site.address.street}, {site.address.postalCode} {site.address.locality}
                  <small>{t.direct.map}</small>
                </a>
              </li>
              <li>
                <Clock />
                <span>{t.direct.hours}</span>
                <p>
                  {t.direct.hoursValue.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <form ref={form} className={`light ${styles.form}`} noValidate onSubmit={onSubmit} aria-describedby="contacte-nota">
          {status === "invalid" && Object.values(errors).some(Boolean) && (
            <p className={styles.summary} role="alert">
              {f.errors.summary}
            </p>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="contacte-name">{f.name}</label>
              <input type="text" autoComplete="name" required {...fieldProps("name")} />
              {error("name")}
            </div>
            <div className={styles.field}>
              <label htmlFor="contacte-email">{f.email}</label>
              <input type="email" autoComplete="email" inputMode="email" required {...fieldProps("email")} />
              {error("email")}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="contacte-phone">
                {f.phone} <span className={styles.optional}>({f.optional})</span>
              </label>
              <input type="tel" name="phone" id="contacte-phone" autoComplete="tel" inputMode="tel" />
            </div>
            <div className={styles.field}>
              <label htmlFor="contacte-town">
                {f.town} <span className={styles.optional}>({f.optional})</span>
              </label>
              <input type="text" name="town" id="contacte-town" autoComplete="address-level2" />
            </div>
          </div>

          <fieldset className={styles.types}>
            <legend>{f.type}</legend>
            <div>
              {f.types.map((option, index) => (
                <label key={option.value} className={styles.chip}>
                  <input type="radio" name="type" value={option.value} defaultChecked={index === 1} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="contacte-message">{f.message}</label>
            <textarea rows={5} placeholder={f.messagePlaceholder} required {...fieldProps("message")} />
            {error("message")}
          </div>

          <div className={styles.field}>
            <label className={styles.check}>
              <input type="checkbox" {...fieldProps("privacy")} />
              <span>
                {privacyBefore}
                <Link href={legalPath[locale]}>{f.privacyLink}</Link>
                {privacyAfter}
              </span>
            </label>
            {error("privacy")}
          </div>

          <button type="submit" className={`btn ${styles.submit}`}>
            {f.submit}
            <ArrowRight />
          </button>
          <p id="contacte-nota" className={styles.note}>
            {f.note}
          </p>
          {status === "opened" && (
            <p className={styles.opened} role="status">
              {fill(f.opened, { email: site.email })}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
