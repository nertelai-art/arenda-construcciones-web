"use client";

// Seguiment de les visites dels leads amb PostHog: qui obri la demo, per on passa, on clica i la
// gravació de la visita. Només s'engega si el navegador porta la galeta d'un enllaç personal (la
// posa la porta), i quan la pàgina ja s'ha carregat: no frena la primera pintada.

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { parseLeadCookie } from "./names";

type PostHog = (typeof import("posthog-js"))["default"];

let client: Promise<PostHog | null> | null = null;

/** Una sola instància per pestanya, encara que el component es munte més d'una vegada. */
function start(site: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const lead = parseLeadCookie(document.cookie);
  if (!key || !lead) return Promise.resolve(null);
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true },
    });
    posthog.register({ site });
    posthog.identify(lead.lead, { name: lead.name });
    return posthog;
  });
  return client;
}

/**
 * Per quines seccions passa: cada `section[id]` que ocupa almenys mitja pantalla (o la meitat de
 * si mateixa, si és més baixa), una vegada per pàgina.
 */
function watchSections(posthog: PostHog) {
  const seen = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        const enough = Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.5;
        if (!seen.has(id) && entry.isIntersecting && entry.intersectionRect.height >= enough) {
          seen.add(id);
          posthog.capture("section_viewed", { section: id, path: window.location.pathname });
        }
      }
    },
    { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  );
  document.querySelectorAll("section[id]").forEach((section) => observer.observe(section));
  return () => observer.disconnect();
}

export function DemoTracker({ site }: { site: string }) {
  const pathname = usePathname();
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    const run = () =>
      void start(site).then((posthog) => {
        if (posthog && !cancelled) stop = watchSections(posthog);
      });
    const idle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 1500);
    return () => {
      cancelled = true;
      stop();
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [site, pathname]);
  return null;
}
