"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { heldProgress, sceneProgress } from "@/lib/scene-progress";

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

/*
 * Escenes altes amb contingut enganxós (la vila i el bany). Un sol escoltador de scroll i un sol
 * fotograma per a totes: primer es llegeixen les posicions i després s'escriu.
 *
 * Una escena que ja s'ha vist fins al final s'hi queda (`heldProgress`): tornar a pujar no la
 * rebobina. Quan el scroll fa una estona que s'ha aturat, la secció deixa de ser alta i ocupa una
 * sola pantalla amb l'últim fotograma (`data-done`), perquè pujar no sigui recórrer pantalles on
 * no passa res; el scroll es compensa perquè el que hi ha a la vista no es mogui. `replay` la torna
 * a deixar com al principi. Mateix criteri que a culleramotor.
 */
type Scene = {
  element: () => HTMLElement | null;
  sticky: () => HTMLElement | null;
  onProgress: (progress: number, done: boolean) => void;
  last: number;
  done: boolean;
  collapsed: boolean;
};

const scenes = new Set<Scene>();
let frame = 0;
let idleTimer = 0;
/** Quanta estona sense scroll vol dir que s'ha aturat, en mil·lisegons. */
const SCROLL_IDLE = 180;

function flush() {
  frame = 0;
  const viewport = window.innerHeight;
  const changed: [Scene, number][] = [];
  for (const scene of scenes) {
    const element = scene.element();
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const sticky = scene.collapsed ? 0 : (scene.sticky()?.offsetHeight ?? 0);
    const held = heldProgress(sceneProgress({ top: rect.top, height: rect.height, sticky, viewport }), scene.done);
    if (held.done && !scene.done) {
      scene.done = true;
      armCollapse();
    }
    if (held.progress !== scene.last) changed.push([scene, held.progress]);
  }
  for (const [scene, progress] of changed) {
    scene.last = progress;
    scene.onProgress(progress, scene.done);
  }
}

function schedule() {
  // Una pestanya amagada no rep fotogrames: es calcula al moment, perquè en tornar-hi tot sigui al seu lloc.
  if (document.visibilityState === "hidden") flush();
  else if (!frame) frame = requestAnimationFrame(flush);
}

/** Les escenes acabades es pleguen quan el scroll fa una estona que s'ha aturat, no a mig gest. */
function armCollapse() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(collapse, SCROLL_IDLE);
}

function collapse() {
  idleTimer = 0;
  for (const scene of scenes) {
    if (!scene.done || scene.collapsed) continue;
    const section = scene.element();
    const stage = scene.sticky();
    if (!section || !stage) continue;
    const before = stage.getBoundingClientRect().top;
    section.closest("section")?.setAttribute("data-done", "");
    scene.collapsed = true;
    const shift = stage.getBoundingClientRect().top - before;
    if (shift !== 0) window.scrollBy({ top: shift, behavior: "instant" });
  }
}

function onScroll() {
  schedule();
  if (idleTimer) armCollapse();
}

function addScene(scene: Scene) {
  if (scenes.size === 0) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
  }
  scenes.add(scene);
  schedule();
  return () => {
    scenes.delete(scene);
    if (scenes.size === 0) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    }
  };
}

function replayScene(scene: Scene) {
  const section = scene.element();
  if (!section) return;
  section.closest("section")?.removeAttribute("data-done");
  scene.done = false;
  scene.collapsed = false;
  scene.last = Number.NaN;
  window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
  schedule();
}

/**
 * Progrés (0-1) del scroll dins d'una secció alta (`ref`) amb contingut enganxós (`sticky`). Es
 * guarda en una ref i no en estat: canvia a cada píxel i no volem re-renderitzar React.
 * `onChange` rep el progrés i si l'escena ja s'ha acabat, i toca el DOM directament.
 *
 * - `progress`: el progrés actual, que llegeix l'escena 3D a cada fotograma.
 * - `snap`: es posa a `true` en tornar a començar, perquè l'escena hi salti en lloc de rebobinar.
 * - `replay`: porta al principi i deixa l'escena sense acabar, per tornar-la a veure.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, sticky: RefObject<HTMLElement | null>, onChange?: (progress: number, done: boolean) => void) {
  const progress = useRef(0);
  const snap = useRef(false);
  const callback = useRef(onChange);
  const scene = useRef<Scene | null>(null);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    const current: Scene = {
      element: () => ref.current,
      sticky: () => sticky.current,
      last: Number.NaN,
      done: false,
      collapsed: false,
      onProgress: (value, done) => {
        progress.current = value;
        callback.current?.(value, done);
      },
    };
    scene.current = current;
    return addScene(current);
  }, [ref, sticky]);
  const replay = useCallback(() => {
    if (!scene.current) return;
    snap.current = true;
    replayScene(scene.current);
  }, []);
  return { progress, snap, replay };
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
