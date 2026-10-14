import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Les dues regles de `no-restricted-imports` se sobreescriuen (no se sumen): la segona, més
// estricta, ha d'anar després perquè mani als fitxers on coincideixen.
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "shots/**"] },
  ...next,
  ...nextTs,
  {
    // three.js pesa: només entra als fitxers d'escena, que es carreguen en diferit.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/**/*Scene.tsx", "src/components/three/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["three", "three/*", "@react-three/*"], message: "three.js només pot entrar als fitxers *Scene.tsx o a src/components/three, que es carreguen amb next/dynamic." }] }],
    },
  },
  {
    // La lògica de les escenes i el contingut són TypeScript pur: es proven sense navegador.
    files: ["src/lib/**", "src/content/**", "src/components/**/*-phases.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["react", "react-dom", "next/*", "three", "three/*", "@react-three/*"], message: "Aquest fitxer ha de ser TypeScript pur, sense React, Next ni three.js." }] }],
    },
  },
];

export default config;
