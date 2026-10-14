# Arenda Construcciones (Quality Constructions) — web

Web nova d'**Arenda Construcciones 2003 S.L.**, marca comercial **Quality Constructions**: la
constructora del grup Quality Estates, a Sant Antoni de Calonge. Substitueix el WordPress de
quality-constructions.com (en anglès, cinc pàgines i cinc fotos). Afina les regles de casa de
`~/.claude/CLAUDE.md`; el que no surt aquí, ve d'allà.

## Què és

Una portada llarga en **català, castellà i anglès** amb **una sola acció**: demanar la primera
visita (gratuïta). Next.js 16 (App Router), React 19, TypeScript, CSS Modules. Sense Tailwind i
sense llibreria d'animació: `three` només per a les dues escenes «anatomia».

```bash
pnpm dev          # next dev --webpack (el SWC natiu està bloquejat en aquesta màquina)
pnpm check        # typecheck + lint + tests
pnpm build:local  # build de producció amb webpack; a CI és `pnpm build`
pnpm images       # regenera public/images, public/brand, icona i og.jpg des d'assets-src
```

Previsualització: `.claude/launch.json` (`arenda-dev`, `arenda-prod`).

## Com està muntat

- `src/app/(ca)`, `(es)/es`, `(en)/en` — un layout arrel per idioma (per al `lang` de `<html>`).
  El català viu a l'arrel. `global-not-found.tsx` per a les URL que no existeixen.
- `src/content/` — **tot el text**. `ca.ts` és la font de veritat i en surt el tipus
  `Dictionary`; `es.ts` i `en.ts` l'han de complir. Una prova comprova que els tres tenen la
  mateixa estructura. `photos.ts`: les fotos del client i les seves mides.
- `src/lib/` — TypeScript pur, provat: `i18n` (rutes i `hreflang`), `site` (dades del negoci),
  `contact` (validació i correu preparat), `seo` (dades estructurades), `easing`, `deployment`.
- `src/components/home/` — una secció per fitxer, amb el seu `.module.css`.
- `src/components/villa/` — escena 3D «Del plànol a la realitat» (obra nova):
  - `villa-phases.ts` (+ prova): la coreografia, pura. Única font de veritat dels temps; la
    llegeixen l'escena i l'HTML.
  - `villa-geometry.ts`: mides i peces en metres (façanes amb obertures, pilars, canonades…).
  - `VillaScene.tsx`: el `<Canvas>`. `VillaShowcase.tsx`: la secció sticky, que el carrega en diferit.
- `src/components/bath/` — escena 3D «Una reforma, capa a capa» (bany), mateixa estructura.
- `src/components/three/` — textures per codi, trams de canonada en instàncies i el `SceneCanvas`
  comú. **three.js només pot entrar aquí i als `*Scene.tsx`** (regla d'ESLint).
- `src/components/scroll/scroll-scene.ts` — hooks de progrés del scroll (de la skill `scroll-3d-scenes`).

## Direcció visual

Ve del logotip i de les fotos de les seves obres (detall a `src/app/globals.css`): antracita de les
lletres QE, calç i pedra de les seves viles, i els tres traços de pinzell del logotip (blau, groc,
vermell) com a motiu. Schibsted Grotesk als titulars; Open Sans (la del nom del logotip i del rètol
del showroom) al text. Les seccions fosques entren amb el perfil d'una teulada a quatre aigües.

## Regles pròpies

- **El contingut és real o no hi és.** Tot surt del web actual o del web del grup
  (quality-estates.com, mateix CIF i oficina). Res de ressenyes, anys ni noms de poble inventats.
- **Les dues escenes són il·lustracions**, no obres reals, i ho diuen a la pàgina. El bany s'inspira
  en la foto del bany reformat; el seu «abans» és genèric.
- Escenes: `frameloop="demand"`, progrés en una ref, zero objectes nous per fotograma, res de
  `setState` al scroll, sense mapa d'entorn. Els materials que s'encenen al capvespre són de
  mòdul (es modifiquen a cada fotograma i React no els ha de veure com a seus).
- La càmera de la vila no baixa de 0,38 rad d'elevació: així l'horitzó no surt mai a pla i no cal
  casar el terra amb el cel CSS. Ho vigila una prova.
- Sense proveïdor d'enviament, el formulari **prepara un correu** (`mailto:`) amb tot escrit.
- No s'indexa fins que el web sigui al domini del client (`SITE_INDEXABLE=true`).

## Verificació visual

`node scripts/shoot.mjs <url> <prefix> <ample>x<alt> <pas>…` fa captures amb Chrome sense finestra
(CDP, sense dependències) i llista errors de consola i peticions fallides. Serveix quan el panell
del navegador està amagat i `requestAnimationFrame` queda congelat. Passos: `top`,
`p:obra-nova:0.55` o `p:reformes:0.3` (progrés dins de l'escena), `id:obres`, `click:<selector>`,
`type:text`, `js:<expressió>`, `shot:<nom>`, `wait:<ms>`. Variables: `REDUCED=1`, `NOWEBGL=1`.

## Versions

TypeScript 6 i ESLint 9 són a posta: `typescript-eslint` 8.71 no accepta TypeScript 7 i
`eslint-plugin-react` 7.37 no arriba a ESLint 10 (mirat el 14-10-2026). Node 24 i pnpm 12, com a
culleramotor. `@types/node` va a 24.

`three` 0.186 avisa a la consola que `THREE.Clock` està obsolet: l'avís ve de dins de
`@react-three/fiber` 9.8 i no es pot treure des d'aquí.

## Pendent de confirmar amb el client

- **Xifres**: «més de 20 anys» i «més de 1.000 projectes» surten del web de Quality Estates (la
  segona, de la seva pàgina d'obres). Confirmar que valen per a la constructora.
- **Horari** (dl–dv 8:30–18:00, ds 9:00–14:00): és el de l'oficina, segons el web del grup.
- **Fotos**: `obra-coberta` i `terrassa-pergola` són del web del grup; confirmar que són obres
  seves. Falten poble i any de cada obra per als peus de foto, i més fotos (sobretot d'obra nova).
- **Correu**: el web actual fa servir info@quality-constructions.com i, al peu,
  info@quality-renting.com. S'ha triat el primer.
- **Textos**: esborrany escrit a partir dels dos webs; els passos de les escenes descriuen un
  procés raonable però no validat per ells. Neerlandès, alemany i francès (parlen sis idiomes).
- **Avís legal**: falten les dades del Registre Mercantil. No s'han inventat.
- **Logotip**: el PNG del web actual (646 × 291). La versió per a fons fosc es genera a
  `pnpm images`; quan arribi el vector oficial, la substitueix.

## Pendent abans de publicar

- Repositori remot, projecte de Vercel i domini: no s'ha creat res fora d'aquesta màquina.
- Proveïdor d'enviament del formulari (darrere d'una frontera pròpia) i, amb ell, l'avís de privacitat.
- Lighthouse i un iPhone de veritat: les escenes s'han mirat a Chrome d'escriptori i a mida de mòbil.
