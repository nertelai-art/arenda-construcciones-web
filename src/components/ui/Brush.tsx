import type { CSSProperties } from "react";

/**
 * Un traç de pinzell com els tres del logotip: gruixut al mig, prim a les puntes i una mica
 * corbat. Es pinta amb el degradat del color del logotip. Amb `reveal`, es dibuixa d'esquerra a
 * dreta quan entra a la pantalla.
 */
export type BrushColor = "blau" | "groc" | "vermell";

const gradients: Record<BrushColor, [string, string]> = {
  blau: ["#006eb8", "#0e52a5"],
  groc: ["#fff03b", "#f6a040"],
  vermell: ["#e72426", "#b31d21"],
};

// Tres formes lleugerament diferents, perquè dos traços seguits no semblin copiats.
const shapes = [
  "M3 31 C 70 12 180 3 300 6 C 345 7 380 11 397 17 C 380 15 344 14 300 15 C 190 18 85 30 9 39 C 4 39 1 35 3 31 Z",
  "M2 22 C 90 6 220 2 396 12 C 399 14 398 18 394 19 C 240 14 120 20 8 34 C 3 34 0 27 2 22 Z",
  "M4 36 C 60 20 160 8 260 7 C 320 6 370 10 398 20 C 360 17 310 16 260 17 C 170 19 80 30 10 42 C 5 43 2 39 4 36 Z",
];

/**
 * Els degradats, una sola vegada per pàgina (a RootShell). Un SVG amb `display: none` no deixa
 * fer servir els seus degradats en alguns navegadors: per això és de mida zero i no amagat.
 */
export function BrushDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {(Object.keys(gradients) as BrushColor[]).map((color) => (
          <linearGradient key={color} id={`brush-${color}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={gradients[color][0]} />
            <stop offset="1" stopColor={gradients[color][1]} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

type Props = {
  color: BrushColor;
  variant?: 0 | 1 | 2;
  reveal?: boolean;
  className?: string;
  style?: CSSProperties;
  index?: number;
};

export function Brush({ color, variant = 0, reveal = false, className, style, index = 0 }: Props) {
  return (
    <svg
      viewBox="0 0 400 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ ...style, ["--i" as string]: index }}
      data-reveal={reveal ? "stroke" : undefined}
    >
      <path d={shapes[variant]} fill={`url(#brush-${color})`} />
    </svg>
  );
}
