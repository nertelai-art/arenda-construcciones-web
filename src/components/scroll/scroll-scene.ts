"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

// Peces comunes de les escenes guiades pel scroll (copiat de la skill scroll-3d-scenes).

let webgl: boolean | undefined;
function supportsWebGL() {
  if (webgl === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const noop = () => () => {};
const subscribeReducedMotion = (callback: () => void) => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

/** «3d», «static» (sense WebGL) o «pending» al servidor, fins que hidrata. */
export function useRenderMode() {
  return useSyncExternalStore(noop, () => (supportsWebGL() ? "3d" : "static"), () => "pending" as const);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
}

/** Es torna `true` (per sempre) quan l'element és a menys de `margin` de la pantalla. */
export function useNearViewport(ref: RefObject<HTMLElement | null>, margin = "1500px", idleAfter?: number) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    observer.observe(element);
    const cancelIdle = idleAfter === undefined ? undefined : whenIdle(idleAfter, () => setNear(true));
    return () => {
      observer.disconnect();
      cancelIdle?.();
    };
  }, [ref, margin, idleAfter]);
  return near;
}

/**
 * Crida `callback` quan el navegador està ociós, passats `delay` ms des de la càrrega. Muntar una
 * escena 3D costa uns quants centenars de mil·lisegons (three.js, textures, GPU): millor pagar-ho
 * mentre es llegeix la capçalera que no a batzegades en ple scroll. Amb «estalvi de dades» o
 * menys de 4 nuclis no es fa: s'espera que la secció sigui a prop.
 */
function whenIdle(delay: number, callback: () => void) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || (navigator.hardwareConcurrency ?? 0) < 4 || typeof window.requestIdleCallback !== "function") return undefined;
  let idle = 0;
  const start = () => {
    timer = window.setTimeout(() => (idle = window.requestIdleCallback(callback, { timeout: 4000 })), delay);
  };
  let timer = 0;
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    window.removeEventListener("load", start);
    window.clearTimeout(timer);
    if (idle) window.cancelIdleCallback(idle);
  };
}

/**
 * Progrés (0-1) del scroll dins d'una secció alta amb contingut sticky. Es guarda en una ref i no
 * en estat: canvia a cada píxel i no volem re-renderitzar React. `onChange` permet tocar el DOM.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onChange?: (progress: number) => void) {
  const progress = useRef(0);
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    const update = () => {
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      progress.current = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1;
      callback.current?.(progress.current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return progress;
}

/**
 * Progrés (0-1) d'un element normal (no sticky) mentre travessa la pantalla: 0 quan el seu cap
 * arriba a `start` (fracció de l'alçada de la pantalla, des de dalt) i 1 quan el seu peu arriba a
 * `end`. Com `useScrollProgress`, només toca el DOM des d'`onChange`.
 */
export function useViewportProgress(
  ref: RefObject<HTMLElement | null>,
  onChange: (progress: number) => void,
  { start = 0.85, end = 0.4 }: { start?: number; end?: number } = {},
) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const distance = rect.height + (start - end) * viewport;
      const value = distance > 0 ? (start * viewport - rect.top) / distance : 1;
      callback.current(Math.min(1, Math.max(0, value)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref, start, end]);
}
