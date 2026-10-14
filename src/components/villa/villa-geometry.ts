// Mides i peces de la vila, en metres, sense three.js. +x a la dreta, +z cap a la càmera (la
// piscina), y amunt. La casa s'inspira en la vila de la foto de capçalera: un cos principal amb
// teulada a quatre aigües, una ala de coberta plana, la xemeneia de pedra i la piscina al davant.

export type Vec3 = readonly [number, number, number];
export type Box = { center: Vec3; size: Vec3 };

export const GROUND = 0;
/** Cara de dalt de la llosa: el terra de la casa. */
export const FLOOR = 0.3;
export const WALL_TOP = 3.3;
export const SLAB_TOP = 3.6;
export const WALL = 0.3;

export const MAIN = { x: [-6, 3], z: [-4, 2] } as const;
export const WING = { x: [3, 7], z: [-4, 0.5] } as const;
export const POOL = { x: [-4.5, 2.5], z: [4, 7.5], depth: 1.4 } as const;
export const TERRACE = { x: [-7, 8], z: [2.4, 9.4] } as const;
export const CHIMNEY = { x: [-1.85, -0.55], z: [2.0, 2.85], top: 4.8 } as const;
/** Teulada a quatre aigües del cos principal: base amb volada i carener. */
export const ROOF = { x: [-6.5, 3.5], z: [-4.5, 2.5], eave: SLAB_TOP, ridge: SLAB_TOP + 1.7 } as const;

type Opening = { from: number; to: number; bottom: number; top: number; kind: "window" | "door" };

/** Una façana: un mur que corre per l'eix `axis` a la coordenada fixa `at`, amb obertures. */
export type Facade = {
  id: string;
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  /** Cap a on s'obre la casa quan «explota»: la normal cap a fora. */
  normal: Vec3;
  openings: Opening[];
};

const half = WALL / 2;

export const FACADES: Facade[] = [
  {
    id: "main-front",
    axis: "x",
    at: MAIN.z[1],
    from: MAIN.x[0] - half,
    to: MAIN.x[1] + half,
    normal: [0, 0, 1],
    openings: [
      { from: -5.2, to: -2.6, bottom: 1.0, top: 2.8, kind: "window" },
      { from: 0.1, to: 2.5, bottom: FLOOR, top: 2.9, kind: "door" },
    ],
  },
  {
    id: "main-back",
    axis: "x",
    at: MAIN.z[0],
    from: MAIN.x[0] - half,
    to: MAIN.x[1] + half,
    normal: [0, 0, -1],
    openings: [
      { from: -4.8, to: -3.4, bottom: 1.4, top: 2.6, kind: "window" },
      { from: -1.6, to: -0.2, bottom: 1.4, top: 2.6, kind: "window" },
    ],
  },
  {
    id: "main-left",
    axis: "z",
    at: MAIN.x[0],
    from: MAIN.z[0] + half,
    to: MAIN.z[1] - half,
    normal: [-1, 0, 0],
    openings: [{ from: -2.2, to: -0.4, bottom: 1.0, top: 2.8, kind: "window" }],
  },
  {
    id: "main-right",
    axis: "z",
    at: MAIN.x[1],
    from: WING.z[1] + half,
    to: MAIN.z[1] - half,
    normal: [1, 0, 0],
    openings: [],
  },
  {
    id: "wing-back",
    axis: "x",
    at: WING.z[0],
    from: WING.x[0] + half,
    to: WING.x[1] + half,
    normal: [0, 0, -1],
    openings: [],
  },
  {
    id: "wing-right",
    axis: "z",
    at: WING.x[1],
    from: WING.z[0] + half,
    to: WING.z[1] - half,
    normal: [1, 0, 0],
    openings: [{ from: -2.6, to: -0.8, bottom: 1.0, top: 2.8, kind: "window" }],
  },
  {
    id: "wing-front",
    axis: "x",
    at: WING.z[1],
    from: WING.x[0] + half,
    to: WING.x[1] + half,
    normal: [0, 0, 1],
    openings: [{ from: 3.6, to: 6.6, bottom: FLOOR, top: 2.9, kind: "door" }],
  },
];

/**
 * Els trossos de mur d'una façana: entre obertures, sota l'ampit i sobre la llinda.
 * `reveal` aparta el mur de les obertures (el maó queda 2 cm enrere de l'arrebossat, perquè les
 * dues cares no coincideixin al mateix pla) i `extend` allarga els extrems (cantonades netes).
 */
export function facadeBoxes(facade: Facade, { thickness = WALL, top = WALL_TOP, reveal = 0, extend = 0 } = {}): Box[] {
  const boxes: Box[] = [];
  const run = (a: number, b: number, y0: number, y1: number) => {
    if (b - a < 0.001 || y1 - y0 < 0.001) return;
    const mid = (a + b) / 2;
    const center: Vec3 = facade.axis === "x" ? [mid, (y0 + y1) / 2, facade.at] : [facade.at, (y0 + y1) / 2, mid];
    const size: Vec3 = facade.axis === "x" ? [b - a, y1 - y0, thickness] : [thickness, y1 - y0, b - a];
    boxes.push({ center, size });
  };
  const openings = [...facade.openings].sort((a, b) => a.from - b.from);
  let cursor = facade.from - extend;
  for (const opening of openings) {
    const from = opening.from - reveal;
    const to = opening.to + reveal;
    run(cursor, from, FLOOR, top);
    run(from, to, FLOOR, opening.bottom - (opening.bottom > FLOOR ? reveal : 0));
    run(from, to, opening.top + reveal, top);
    cursor = to;
  }
  run(cursor, facade.to + extend, FLOOR, top);
  return boxes;
}

/** Pilars de formigó, dins el gruix dels murs. */
export const COLUMNS: readonly (readonly [number, number])[] = [
  [-6, -4],
  [-1.5, -4],
  [3, -4],
  [5, -4],
  [7, -4],
  [-6, -1],
  [-6, 2],
  [-1.5, 2],
  [3, 2],
  [3, 0.5],
  [5, 0.5],
  [7, 0.5],
];

/** Lloses: la de fonamentació (a terra) i el forjat (a dalt), de cada cos. */
export const SLABS = {
  foundation: [
    { center: [(MAIN.x[0] + MAIN.x[1]) / 2, FLOOR / 2, (MAIN.z[0] + MAIN.z[1]) / 2], size: [MAIN.x[1] - MAIN.x[0] + 0.6, FLOOR, MAIN.z[1] - MAIN.z[0] + 0.6] },
    { center: [(WING.x[0] + 0.3 + WING.x[1] + 0.3) / 2, FLOOR / 2, (WING.z[0] - 0.3 + WING.z[1] + 0.3) / 2], size: [WING.x[1] - WING.x[0], FLOOR, WING.z[1] - WING.z[0] + 0.6] },
  ] satisfies Box[],
  deck: [
    { center: [(MAIN.x[0] + MAIN.x[1]) / 2, (WALL_TOP + SLAB_TOP) / 2, (MAIN.z[0] + MAIN.z[1]) / 2], size: [MAIN.x[1] - MAIN.x[0] + 0.6, SLAB_TOP - WALL_TOP, MAIN.z[1] - MAIN.z[0] + 0.6] },
    { center: [(WING.x[0] + 0.3 + WING.x[1] + 0.3) / 2, (WALL_TOP + SLAB_TOP) / 2, (WING.z[0] - 0.3 + WING.z[1] + 0.3) / 2], size: [WING.x[1] - WING.x[0], SLAB_TOP - WALL_TOP, WING.z[1] - WING.z[0] + 0.6] },
  ] satisfies Box[],
};

/** Ampit de la coberta plana de l'ala. */
export const PARAPET: Box[] = [
  { center: [5.15, SLAB_TOP + 0.15, WING.z[1] + 0.22], size: [4.3, 0.3, 0.16] },
  { center: [5.15, SLAB_TOP + 0.15, WING.z[0] - 0.22], size: [4.3, 0.3, 0.16] },
  { center: [WING.x[1] + 0.22, SLAB_TOP + 0.15, -1.75], size: [0.16, 0.3, 4.9] },
];

/** Vèrtexs de les quatre aigües, en l'ordre en què es fan els triangles. */
export function roofFaces() {
  const [x0, x1] = ROOF.x;
  const [z0, z1] = ROOF.z;
  const zm = (z0 + z1) / 2;
  const run = (z1 - z0) / 2;
  const r0: Vec3 = [x0 + run, ROOF.ridge, zm];
  const r1: Vec3 = [x1 - run, ROOF.ridge, zm];
  const e = ROOF.eave;
  const a: Vec3 = [x0, e, z1];
  const b: Vec3 = [x1, e, z1];
  const c: Vec3 = [x1, e, z0];
  const d: Vec3 = [x0, e, z0];
  return {
    ridge: [r0, r1] as const,
    corners: [a, b, c, d] as const,
    // Cada aigua: vèrtexs en sentit antihorari vist des de fora.
    faces: [
      [a, b, r1, r0], // davant
      [c, d, r0, r1], // darrere
      [d, a, r0], // esquerra
      [b, c, r1], // dreta
    ] as Vec3[][],
  };
}

export type Polyline = readonly Vec3[];

const y = FLOOR + 0.05;
/** Canonades i tubs: arriben per sota la llosa, corren pel terra i pugen pels murs. */
export const PIPES: Record<"cold" | "hot" | "power", Polyline[]> = {
  cold: [
    [[-6.6, y, -2.5], [-5.6, y, -2.5], [-5.6, y, -0.9], [-3.2, y, -0.9], [-3.2, y, -3.6], [-3.2, 1.2, -3.6]],
    [[-3.2, y, -0.9], [0.9, y, -0.9], [0.9, y, -3.6], [0.9, 1.1, -3.6]],
    [[0.9, y, -0.9], [4.2, y, -0.9], [4.2, y, -3.6], [4.2, 1.1, -3.6]],
    [[-5.6, y, -0.9], [-5.6, y, 1.6], [-4.0, y, 1.6]],
  ],
  hot: [
    [[-5.2, y, -3.4], [-5.2, 2.0, -3.4]],
    [[-5.2, y, -3.4], [-5.2, y, -1.3], [-2.8, y, -1.3], [-2.8, y, -3.6], [-2.8, 1.2, -3.6]],
    [[-2.8, y, -1.3], [1.3, y, -1.3], [1.3, y, -3.6], [1.3, 1.1, -3.6]],
    [[1.3, y, -1.3], [1.3, y, 0.8], [-4.5, y, 0.8], [-4.5, y, 1.7], [-4.5, 0.7, 1.7]],
    [[1.3, y, 0.8], [5.2, y, 0.8], [5.2, y, 0.1], [5.2, 0.7, 0.1]],
  ],
  power: [
    [[-6.4, 0.9, 1.4], [-5.7, 0.9, 1.4], [-5.7, 2.9, 1.4], [-5.7, 2.9, -3.4], [0.6, 2.9, -3.4], [6.6, 2.9, -3.4]],
    [[-5.7, 2.9, -0.9], [2.6, 2.9, -0.9], [2.6, 2.9, 1.6], [2.6, 1.1, 1.6]],
    [[-2.0, 2.9, -0.9], [-2.0, 2.9, 1.6], [-2.0, 1.1, 1.6]],
    [[2.6, 2.9, -0.9], [6.6, 2.9, -0.9], [6.6, 2.9, 0.1], [6.6, 1.1, 0.1]],
    [[0.6, 2.9, -3.4], [0.6, 1.1, -3.4]],
  ],
};

/** Lloses de la terrassa (1 × 1 m), sense les que cauen dins la piscina o la seva vora. */
export function terraceTiles() {
  const tiles: { x: number; z: number }[] = [];
  for (let x = TERRACE.x[0] + 0.5; x < TERRACE.x[1]; x += 1) {
    for (let z = TERRACE.z[0] + 0.5; z < TERRACE.z[1]; z += 1) {
      const inPool = x > POOL.x[0] - 0.6 && x < POOL.x[1] + 0.6 && z > POOL.z[0] - 0.6 && z < POOL.z[1] + 0.6;
      if (!inPool) tiles.push({ x, z });
    }
  }
  return tiles;
}

/** Vora de la piscina (pedra), quatre peces. */
export const COPING: Box[] = [
  { center: [(POOL.x[0] + POOL.x[1]) / 2, 0.05, POOL.z[0] - 0.3], size: [POOL.x[1] - POOL.x[0] + 1.2, 0.1, 0.6] },
  { center: [(POOL.x[0] + POOL.x[1]) / 2, 0.05, POOL.z[1] + 0.3], size: [POOL.x[1] - POOL.x[0] + 1.2, 0.1, 0.6] },
  { center: [POOL.x[0] - 0.3, 0.05, (POOL.z[0] + POOL.z[1]) / 2], size: [0.6, 0.1, POOL.z[1] - POOL.z[0]] },
  { center: [POOL.x[1] + 0.3, 0.05, (POOL.z[0] + POOL.z[1]) / 2], size: [0.6, 0.1, POOL.z[1] - POOL.z[0]] },
];
