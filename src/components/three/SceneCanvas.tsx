"use client";

// El <Canvas> comú de les escenes, amb les regles de rendiment de la skill scroll-3d-scenes:
// es pinta només quan hi ha scroll o quan l'animació encara s'assenta, dpr adaptatiu, sense mapa
// d'entorn (no hi ha reflexos: així no cal prefiltrar cap PMREM) i el canvi de mida de la barra
// d'adreces del mòbil no el redimensiona contínuament. Ombres PCF: three 0.186 ja no té PCFSoftShadowMap.

import { PerformanceMonitor, Preload } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState, type ReactNode } from "react";
import { PCFShadowMap } from "three";

function InvalidateOnScroll() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [invalidate]);
  return null;
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
      {children}
      {/* Compila els shaders en muntar, abans que la secció sigui visible. */}
      <Preload all />
    </Canvas>
  );
}
