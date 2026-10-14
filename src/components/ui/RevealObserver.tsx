"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Mostra amb una transició els elements `[data-reveal]` quan entren a la pantalla, i fa comptar
 * els números `[data-count]` des de zero. Sense JavaScript, tot es veu des del principi.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible), [data-count]:not(.is-counted)");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          if (element.dataset.count !== undefined) count(element, reduced);
          else element.classList.add("is-visible");
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

/** Fa pujar el número fins al valor final en poc més d'un segon (amb el format de l'idioma). */
function count(element: HTMLElement, reduced: boolean) {
  element.classList.add("is-counted");
  const target = Number(element.dataset.count);
  const format = new Intl.NumberFormat(document.documentElement.lang || "ca");
  if (reduced || !Number.isFinite(target) || target <= 1) {
    element.textContent = format.format(target);
    return;
  }
  const duration = 1400;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    element.textContent = format.format(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
