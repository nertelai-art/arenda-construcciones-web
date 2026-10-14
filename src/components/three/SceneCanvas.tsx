"use client";

// El <Canvas> comú de les escenes, amb les regles de rendiment de la skill scroll-3d-scenes:
// es pinta només quan hi ha scroll o quan l'animació encara s'assenta, dpr adaptatiu, sense mapa
// d'entorn (no hi ha reflexos: així no cal prefiltrar cap PMREM) i el canvi de mida de la barra
// d'adreces del mòbil no el redimensiona contínuament. Ombres PCF: three 0.186 ja no té PCFSoftShadowMap.

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { PCFShadowMap, type Object3D } from "three";

/**
 * Demana un fotograma a cada scroll, però només si el canvas és a la vista (o gairebé): amb les dues
 * escenes muntades, la que és fora de pantalla es repintava igualment i doblava la feina de la GPU.
 * No és pausar el bucle: el fotograma següent arriba en quant la secció torna a entrar.
 */
function InvalidateOnScroll() {
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const onScroll = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom > -200 && rect.top < window.innerHeight + 200) invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [invalidate, canvas]);
  return null;
}

const showCanvas = (canvas: HTMLCanvasElement, visible: boolean) => {
  canvas.style.visibility = visible ? "" : "hidden";
};

/** Fa visible tot (també el que queda fora de càmera) i torna una funció que ho deixa com estava. */
function revealAll(scene: Object3D) {
  const hidden: Object3D[] = [];
  const culled: Object3D[] = [];
  scene.traverse((object) => {
    if (!object.visible) {
      hidden.push(object);
      object.visible = true;
    }
    if (object.frustumCulled) {
      culled.push(object);
      object.frustumCulled = false;
    }
  });
  return () => {
    for (const object of hidden) object.visible = false;
    for (const object of culled) object.frustumCulled = true;
  };
}

/**
 * Prepara la GPU abans d'ensenyar res. Amb `<Preload />` (compilació síncrona), muntar l'escena
 * bloquejava la pàgina més d'un segon mentre es llegia la secció anterior (mesurat al build de
 * producció). Ara, en dos temps:
 *  1. `compileAsync` compila tots els shaders en paral·lel (KHR_parallel_shader_compile), sense
 *     bloquejar. Els objectes amagats es fan visibles un moment perquè també hi entrin.
 *  2. Un sol pintat amb tot visible i sense retallar per càmera puja les textures i compila els
 *     shaders de les ombres; si no, ho farien a batzegades el primer cop que aparegués cada peça.
 *     El canvas és invisible durant aquest pintat, que mostraria totes les fases alhora.
 */
function CompileFirst({ children }: { children: ReactNode }) {
  const { gl, scene, camera, invalidate } = useThree();
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let cancelled = false;
    const canvas = gl.domElement;
    showCanvas(canvas, false);
    const restore = revealAll(scene);
    const warm = () => {
      if (cancelled) return;
      const restoreAgain = revealAll(scene);
      gl.render(scene, camera);
      restoreAgain();
      setReady(true);
      invalidate();
      // El fotograma bo arriba al següent rAF: fins llavors, el canvas continua amagat.
      requestAnimationFrame(() => requestAnimationFrame(() => showCanvas(canvas, true)));
    };
    gl.compileAsync(scene, camera).then(warm, (error: unknown) => {
      console.error("No s'han pogut precompilar els shaders", error);
      warm();
    });
    restore();
    return () => {
      cancelled = true;
      showCanvas(canvas, true);
    };
  }, [gl, scene, camera, invalidate]);
  return <group visible={ready}>{children}</group>;
}

export function SceneCanvas({ children, fov = 30, shadows = true }: { children: ReactNode; fov?: number; shadows?: boolean }) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      shadows={shadows ? { type: PCFShadowMap } : false}
      camera={{ position: [10, 10, 10], fov, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 150 } }}
      aria-hidden="true"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
      <InvalidateOnScroll />
      <CompileFirst>{children}</CompileFirst>
    </Canvas>
  );
}
