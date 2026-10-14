"use client";

// L'anatomia d'una obra nova: una vila es construeix capa a capa amb el scroll. Comença com un
// plànol blau dibuixat a terra (amb el volum de la casa en línies, com una axonometria) i acaba
// amb la piscina plena i els llums encesos. Tot per codi: cap model ni cap vídeo.
//
// Regles (skill scroll-3d-scenes): frameloop="demand", progrés en una ref suavitzat amb damp,
// zero objectes nous per fotograma, instàncies per a les peces repetides, materials estables des
// del primer fotograma (els que s'esvaeixen ja neixen transparents).

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Path,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
  type DirectionalLight,
  type Fog,
  type Group,
  type HemisphereLight,
  type InstancedMesh,
  type LineBasicMaterial,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { easeInOut, easeOutBack, easeOutBounce, easeOutCubic, segment, stagger } from "@/lib/easing";
import { seededRandom } from "@/lib/random";
import { SceneCanvas } from "../three/SceneCanvas";
import { buildSegments, updateSegments } from "../three/segments";
import { blobShadowTexture, brickTexture, limestoneTexture, planTexture, roofTileTexture, stoneTexture } from "../three/textures";
import {
  CHIMNEY,
  COLUMNS,
  COPING,
  FACADES,
  FLOOR,
  MAIN,
  PARAPET,
  PIPES,
  POOL,
  SLAB_TOP,
  SLABS,
  TERRACE,
  WALL_TOP,
  WING,
  facadeBoxes,
  roofFaces,
  terraceTiles,
  type Box,
  type Facade,
  type Vec3,
} from "./villa-geometry";
import { BEATS, cameraAt, duskAt, explodeAt, ghostAt, paperToGroundAt } from "./villa-phases";

/** `snapRef`: quan és `true`, l'escena salta al progrés actual en lloc d'anar-hi suaument (en tornar-la a veure). */
export type SceneProps = { progress: RefObject<number>; snapRef: RefObject<boolean>; reducedMotion: boolean };

const SMOOTHING = 4.5;
const MAX_DELTA = 1 / 30;
const FOV = 30;

// Colors: el blau de plànol i els tons de les fotos de les seves obres.
const PAPER = new Color("#f4f8fc");
const EARTH = new Color("#d6c8af");
const SUN_DAY = new Color("#fff4e2");
const SUN_DUSK = new Color("#ffb070");
const SKY_DAY = new Color("#dfeaf5");
const SKY_DUSK = new Color("#8f95cf");
const BOUNCE_DAY = new Color("#b9a68c");
const BOUNCE_DUSK = new Color("#5d5468");
const FOG_DUSK = new Color("#a99aae");
const CONCRETE = new Color("#b5aea4");
const POOL_TILE = new Color("#9fd3dc");

// Materials que s'encenen al capvespre, compartits per moltes peces. Viuen fora del component
// perquè es modifiquen a cada fotograma (React no ha de veure'ls com a valors seus).
const glowMaterial = new MeshBasicMaterial({ color: "#ffd08a", transparent: true, opacity: 0, toneMapped: false });
const lampMaterial = new MeshBasicMaterial({ color: "#ffd59a", transparent: true, opacity: 0, toneMapped: false });
const fireMaterial = new MeshBasicMaterial({ color: "#ff8a2a", transparent: true, opacity: 0, toneMapped: false });

// Temporals reutilitzats: zero objectes nous per fotograma.
const dummy = new Object3D();
const tmpColor = new Color();
const back = new Vector3();
const right = new Vector3();
const up = new Vector3();
const target = new Vector3();
const position = new Vector3();
const matrix = new Matrix4();
const identity = new Quaternion();
const unit = new Vector3(1, 1, 1);

const s = (p: number, beat: keyof typeof BEATS) => segment(p, BEATS[beat]);

/** Caixa amb UV a escala real (1 unitat de textura = `uvScale` metres), per a maó, pedra i formigó. */
function boxGeometry({ center, size }: Box, uvScale = 1) {
  const [w, h, d] = size;
  const [cx, cy, cz] = center;
  const geometry = new BoxGeometry(w, h, d);
  const uv = geometry.getAttribute("uv");
  // Ordre de les cares de BoxGeometry: +x, −x, +y, −y, +z, −z (4 vèrtexs cadascuna).
  const faces: [number, number, number, number][] = [
    [d, h, cz - d / 2, cy - h / 2],
    [d, h, cz - d / 2, cy - h / 2],
    [w, d, cx - w / 2, cz - d / 2],
    [w, d, cx - w / 2, cz - d / 2],
    [w, h, cx - w / 2, cy - h / 2],
    [w, h, cx - w / 2, cy - h / 2],
  ];
  faces.forEach(([fw, fh, u0, v0], face) => {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, (uv.getX(i) * fw + u0) / uvScale, (uv.getY(i) * fh + v0) / uvScale);
    }
  });
  geometry.translate(cx, cy, cz);
  return geometry;
}

/** Les aigües de la teulada, amb UV que segueixen el pendent (la teula baixa cap a la vora). */
function roofGeometry() {
  const { faces } = roofFaces();
  const positions: number[] = [];
  const uvs: number[] = [];
  const TILE_W = 1.6;
  const TILE_H = 1.2;
  for (const face of faces) {
    const [a, b] = face as [Vec3, Vec3];
    const eave = new Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
    const inward = new Vector3(-eave.z, 0, eave.x);
    const project = (v: Vec3) => {
      const rel = new Vector3(v[0] - a[0], v[1] - a[1], v[2] - a[2]);
      return [rel.dot(eave) / TILE_W, Math.hypot(rel.dot(inward), rel.y) / TILE_H] as const;
    };
    const triangles = face.length === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
    for (const triangle of triangles) {
      for (const index of triangle) {
        const v = face[index]!;
        positions.push(...v);
        uvs.push(...project(v));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** El terra, amb el forat de la piscina. */
function groundGeometry() {
  const size = 400;
  const shape = new Shape();
  shape.moveTo(-size / 2, -size / 2);
  shape.lineTo(size / 2, -size / 2);
  shape.lineTo(size / 2, size / 2);
  shape.lineTo(-size / 2, size / 2);
  shape.lineTo(-size / 2, -size / 2);
  // En girar el pla −90° sobre x, la y de la forma passa a ser −z del món.
  const hole = new Path();
  hole.moveTo(POOL.x[0], -POOL.z[0]);
  hole.lineTo(POOL.x[0], -POOL.z[1]);
  hole.lineTo(POOL.x[1], -POOL.z[1]);
  hole.lineTo(POOL.x[1], -POOL.z[0]);
  hole.lineTo(POOL.x[0], -POOL.z[0]);
  shape.holes.push(hole);
  return new ShapeGeometry(shape);
}

type Opening = { center: Vec3; width: number; height: number };

/** Les obertures d'una façana, amb el centre a l'eix del mur. */
function openingsOf(facade: Facade): Opening[] {
  return facade.openings.map((opening) => {
    const mid = (opening.from + opening.to) / 2;
    const y = (opening.bottom + opening.top) / 2;
    return {
      center: facade.axis === "x" ? [mid, y, facade.at] : [facade.at, y, mid],
      width: opening.to - opening.from,
      height: opening.top - opening.bottom,
    };
  });
}

/** Les línies del «plànol en 3D»: volums, teulada, xemeneia, piscina i obertures. */
function ghostGeometry() {
  const boxes: Box[] = [
    { center: [(MAIN.x[0] + MAIN.x[1]) / 2, (FLOOR + SLAB_TOP) / 2, (MAIN.z[0] + MAIN.z[1]) / 2], size: [MAIN.x[1] - MAIN.x[0] + 0.3, SLAB_TOP - FLOOR, MAIN.z[1] - MAIN.z[0] + 0.3] },
    { center: [(WING.x[0] + WING.x[1]) / 2 + 0.15, (FLOOR + SLAB_TOP) / 2, (WING.z[0] + WING.z[1]) / 2], size: [WING.x[1] - WING.x[0] + 0.3, SLAB_TOP - FLOOR, WING.z[1] - WING.z[0] + 0.3] },
    { center: [(CHIMNEY.x[0] + CHIMNEY.x[1]) / 2, (FLOOR + CHIMNEY.top) / 2, (CHIMNEY.z[0] + CHIMNEY.z[1]) / 2], size: [CHIMNEY.x[1] - CHIMNEY.x[0], CHIMNEY.top - FLOOR, CHIMNEY.z[1] - CHIMNEY.z[0]] },
    { center: [(POOL.x[0] + POOL.x[1]) / 2, -POOL.depth / 2, (POOL.z[0] + POOL.z[1]) / 2], size: [POOL.x[1] - POOL.x[0], POOL.depth, POOL.z[1] - POOL.z[0]] },
  ];
  for (const facade of FACADES) {
    for (const opening of openingsOf(facade)) {
      const flat: Vec3 = facade.axis === "x" ? [opening.width, opening.height, 0.001] : [0.001, opening.height, opening.width];
      const out = 0.16;
      boxes.push({ center: [opening.center[0] + facade.normal[0] * out, opening.center[1], opening.center[2] + facade.normal[2] * out], size: flat });
    }
  }
  const parts: BufferGeometry[] = boxes.map((box) => new EdgesGeometry(boxGeometry(box)));
  parts.push(new EdgesGeometry(roofGeometry(), 1));
  return mergeGeometries(parts, false);
}

/** Carener i aresters de la teulada: posició, orientació i llargada de cada cilindre. */
const RIDGES = (() => {
  const { ridge, corners } = roofFaces();
  const lines: [Vec3, Vec3][] = [[ridge[0], ridge[1]], [corners[0], ridge[0]], [corners[3], ridge[0]], [corners[1], ridge[1]], [corners[2], ridge[1]]];
  return lines.map(([a, b]) => {
    const start = new Vector3(...a);
    const end = new Vector3(...b);
    return {
      mid: start.clone().add(end).multiplyScalar(0.5),
      rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), end.clone().sub(start).normalize()),
      length: start.distanceTo(end),
    };
  });
})();

/** Les peces de mur es dibuixen amb el peu a y = 0 dins d'un grup posat a FLOOR (per créixer d'allà). */
function relativeToFloor(box: Box): Box {
  return { center: [box.center[0], box.center[1] - FLOOR, box.center[2]], size: box.size };
}

function Villa({ progress, snapRef, reducedMotion }: SceneProps) {
  const { invalidate, size } = useThree();
  const smooth = useRef(reducedMotion ? 1 : (progress.current ?? 0));

  const textures = useMemo(
    () => ({ plan: planTexture(), roof: roofTileTexture(), stone: stoneTexture(), brick: brickTexture(), limestone: limestoneTexture(), shadow: blobShadowTexture() }),
    [],
  );

  const geo = useMemo(() => {
    const facades = FACADES.map((facade) => ({
      facade,
      openings: openingsOf(facade),
      brick: mergeGeometries(facadeBoxes(facade, { reveal: 0.02 }).map((box) => boxGeometry(relativeToFloor(box), 1.6)), false),
      render: mergeGeometries(facadeBoxes(facade, { thickness: 0.34, top: WALL_TOP + 0.02, extend: 0.02 }).map((box) => boxGeometry(relativeToFloor(box), 2)), false),
    }));
    const chimneyBox: Box = {
      center: [(CHIMNEY.x[0] + CHIMNEY.x[1]) / 2, (CHIMNEY.top - FLOOR) / 2, (CHIMNEY.z[0] + CHIMNEY.z[1]) / 2],
      size: [CHIMNEY.x[1] - CHIMNEY.x[0], CHIMNEY.top - FLOOR, CHIMNEY.z[1] - CHIMNEY.z[0]],
    };
    return {
      facades,
      foundation: mergeGeometries(SLABS.foundation.map((box) => boxGeometry(box, 2)), false),
      deck: mergeGeometries(SLABS.deck.map((box) => boxGeometry(box, 2)), false),
      parapet: mergeGeometries(PARAPET.map((box) => boxGeometry(box)), false),
      coping: mergeGeometries(COPING.map((box) => boxGeometry(box, 1)), false),
      chimney: boxGeometry(chimneyBox, 1.4),
      column: new BoxGeometry(0.26, WALL_TOP - FLOOR, 0.26).translate(0, (WALL_TOP - FLOOR) / 2, 0),
      palmTrunk: new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.12, 1.6, 0.05), new Vector3(0.42, 3.3, 0.12), new Vector3(0.85, 4.7, 0.2)]),
      frond: new BoxGeometry(2.3, 0.04, 0.42).translate(1.15, 0, 0),
      lounger: mergeGeometries([new BoxGeometry(0.72, 0.28, 1.4).translate(0, 0.14, 0.25), new BoxGeometry(0.72, 0.14, 0.7).rotateX(-0.75).translate(0, 0.5, -0.62)], false),
      roof: roofGeometry(),
      ground: groundGeometry(),
      ghost: ghostGeometry(),
    };
  }, []);

  const pipes = useMemo(() => ({ cold: buildSegments(PIPES.cold), hot: buildSegments(PIPES.hot), power: buildSegments(PIPES.power, 0.12) }), []);
  // Les lloses cauen de la casa cap a la càmera.
  const tiles = useMemo(() => terraceTiles().sort((a, b) => a.z - b.z || Math.abs(a.x) - Math.abs(b.x)), []);
  const shrubs = useMemo(() => {
    const random = seededRandom(91);
    const spots: [number, number, number][] = [
      [-7.4, -1.2, 0.85],
      [-7.3, 1.4, 0.7],
      [-7.5, -3.4, 0.75],
      [8.1, -2.6, 0.8],
      [8.3, -0.4, 0.65],
      [8.7, 3.4, 0.9],
      [-8.0, 5.2, 0.8],
      [-8.4, 7.3, 0.6],
      [9.1, 7.8, 0.75],
    ];
    return spots.map(([x, z, r]) => ({ x, z, r, tint: random() }));
  }, []);

  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const fog = useRef<Fog>(null);
  const groundMat = useRef<MeshStandardMaterial>(null);
  const poolMat = useRef<MeshStandardMaterial>(null);
  const shadowMat = useRef<MeshBasicMaterial>(null);
  const hedge = useRef<Group>(null);
  const lidMat = useRef<MeshStandardMaterial>(null);
  const lid = useRef<Mesh>(null);
  const planMat = useRef<MeshBasicMaterial>(null);
  const ghostMat = useRef<LineBasicMaterial>(null);
  const foundation = useRef<Group>(null);
  const columns = useRef<InstancedMesh>(null);
  const deck = useRef<Group>(null);
  const facadeGroups = useRef<(Group | null)[]>([]);
  const brickGroups = useRef<(Group | null)[]>([]);
  const renderGroups = useRef<(Group | null)[]>([]);
  const windowGroups = useRef<(Group | null)[]>([]);
  const roof = useRef<Group>(null);
  const parapet = useRef<Mesh>(null);
  const chimney = useRef<Group>(null);
  const pipeCold = useRef<InstancedMesh>(null);
  const pipeHot = useRef<InstancedMesh>(null);
  const pipePower = useRef<InstancedMesh>(null);
  const water = useRef<Mesh>(null);
  const waterMat = useRef<MeshStandardMaterial>(null);
  const coping = useRef<Mesh>(null);
  const pavers = useRef<InstancedMesh>(null);
  const palm = useRef<Group>(null);
  const umbrella = useRef<Group>(null);
  const loungers = useRef<Group>(null);
  const shrubMesh = useRef<InstancedMesh>(null);
  const shrubColored = useRef(false);

  useFrame((state, rawDelta) => {
    const goal = reducedMotion ? 1 : (progress.current ?? 0);
    if (snapRef.current) {
      smooth.current = goal;
      snapRef.current = false;
    }
    smooth.current = MathUtils.damp(smooth.current, goal, SMOOTHING, Math.min(rawDelta, MAX_DELTA));
    if (Math.abs(smooth.current - goal) < 0.0004) smooth.current = goal;
    else invalidate(); // encara s'assenta: demanem un altre fotograma
    const p = smooth.current;

    const explode = explodeAt(p);
    const dusk = duskAt(p);
    const paper = paperToGroundAt(p);

    // Càmera: òrbita entre punts clau. A escriptori la casa es desplaça a la dreta del text; a
    // mòbil, cap amunt (el text va a baix).
    const pose = cameraAt(p);
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(MathUtils.degToRad(FOV / 2));
    // En vertical, la casa ocupa gairebé tota l'amplada: el text va a dalt i a baix, no al costat.
    const fit = aspect < 0.8 ? pose.fit * 0.82 : pose.fit;
    const radius = fit / 2 / (tanHalf * Math.min(aspect, 1.45));
    back.set(Math.sin(pose.azimuth) * Math.cos(pose.elevation), Math.sin(pose.elevation), Math.cos(pose.azimuth) * Math.cos(pose.elevation));
    right.set(Math.cos(pose.azimuth), 0, -Math.sin(pose.azimuth));
    up.crossVectors(back, right).normalize();
    target.set(0.6, pose.targetY, 1.2);
    if (aspect > 1.1) target.addScaledVector(right, -2 * radius * tanHalf * aspect * 0.17);
    else target.addScaledVector(up, -2 * radius * tanHalf * 0.07);
    state.camera.position.copy(target).addScaledVector(back, radius);
    state.camera.lookAt(target);

    // Llum: del migdia a la llum daurada del capvespre (sense arribar a la nit, perquè es llegeixi).
    if (sun.current) {
      sun.current.intensity = MathUtils.lerp(2.7, 1.5, dusk);
      sun.current.color.copy(SUN_DAY).lerp(SUN_DUSK, dusk);
    }
    if (hemi.current) {
      hemi.current.intensity = MathUtils.lerp(1.25, 0.8, dusk);
      hemi.current.color.copy(SKY_DAY).lerp(SKY_DUSK, dusk);
      hemi.current.groundColor.copy(BOUNCE_DAY).lerp(BOUNCE_DUSK, dusk);
    }
    if (fog.current) fog.current.color.copy(PAPER).lerp(SKY_DAY, paper).lerp(FOG_DUSK, dusk);

    // 01 · El plànol: dibuix a terra i volum en línies.
    tmpColor.copy(PAPER).lerp(EARTH, paper).multiplyScalar(1 - dusk * 0.18);
    groundMat.current?.color.copy(tmpColor);
    lidMat.current?.color.copy(tmpColor);
    // El plànol ja es veu d'entrada (si no, l'escena comença en blanc) i acaba de dibuixar-se en baixar.
    if (planMat.current) planMat.current.opacity = (0.4 + 0.6 * easeOutCubic(s(p, "plan"))) * (1 - easeInOut(segment(p, [0.42, 0.56])));
    if (ghostMat.current) ghostMat.current.opacity = ghostAt(p) * 0.9;

    // 02 · Fonaments: s'obre el forat de la piscina i puja la llosa.
    const dig = easeInOut(s(p, "dig"));
    if (lid.current) {
      lid.current.scale.set(Math.max(0.0001, 1 - dig), Math.max(0.0001, 1 - dig), 1);
      lid.current.visible = dig < 0.999;
    }
    const slab = easeOutCubic(s(p, "slab"));
    if (shadowMat.current) shadowMat.current.opacity = 0.35 * slab;
    if (foundation.current) {
      foundation.current.scale.y = Math.max(0.0001, slab);
      foundation.current.visible = slab > 0;
    }

    // 03 · Estructura: pilars i forjat.
    const columnsT = s(p, "columns");
    if (columns.current) {
      COLUMNS.forEach(([x, z], index) => {
        const grow = easeOutCubic(stagger(columnsT, index, COLUMNS.length, 0.75));
        dummy.position.set(x, FLOOR, z);
        dummy.scale.set(grow > 0 ? 1 : 0, Math.max(0.0001, grow), grow > 0 ? 1 : 0);
        dummy.updateMatrix();
        columns.current!.setMatrixAt(index, dummy.matrix);
      });
      columns.current.instanceMatrix.needsUpdate = true;
    }
    if (deck.current) {
      const fall = easeOutCubic(s(p, "deck"));
      deck.current.visible = fall > 0;
      deck.current.position.y = (1 - fall) * 7 + explode * 3.6;
    }

    // 04 · Tancaments: els murs pugen i després la casa s'obre per ensenyar les instal·lacions.
    const wallsT = s(p, "walls");
    const renderT = easeInOut(s(p, "render"));
    const windowsT = s(p, "windows");
    FACADES.forEach((facade, index) => {
      facadeGroups.current[index]?.position.set(facade.normal[0] * 2.8 * explode, 0, facade.normal[2] * 2.8 * explode);
      const brick = brickGroups.current[index];
      if (brick) {
        const rise = easeOutCubic(stagger(wallsT, index, FACADES.length, 0.55));
        brick.scale.y = Math.max(0.0001, rise);
        brick.visible = rise > 0;
      }
      const render = renderGroups.current[index];
      if (render) {
        render.scale.y = Math.max(0.0001, renderT);
        render.visible = renderT > 0;
      }
      const win = windowGroups.current[index];
      if (win) {
        const pop = easeOutBack(stagger(windowsT, index, FACADES.length, 0.5));
        win.scale.setScalar(Math.max(0.0001, pop));
        win.visible = pop > 0;
      }
    });

    const pipesT = s(p, "pipes");
    const pipesOn = p >= BEATS.pipes[0] && p < BEATS.collapse[1];
    const pipeSets = [
      [pipeCold.current, pipes.cold, 0.07],
      [pipeHot.current, pipes.hot, 0.07],
      [pipePower.current, pipes.power, 0.045],
    ] as const;
    for (const [mesh, list, r] of pipeSets) {
      if (!mesh) continue;
      mesh.visible = pipesOn;
      if (pipesOn) updateSegments(mesh, list, pipesT, r);
    }

    // 05 · Coberta, pedra i fusteria.
    const roofT = s(p, "roof");
    if (roof.current) {
      roof.current.visible = roofT > 0;
      roof.current.position.y = (1 - easeOutBounce(roofT)) * 6;
    }
    if (parapet.current) {
      const rise = easeOutCubic(roofT);
      parapet.current.scale.y = Math.max(0.0001, rise);
      parapet.current.visible = rise > 0;
    }
    if (chimney.current) {
      const stone = easeOutCubic(s(p, "stone"));
      chimney.current.scale.y = Math.max(0.0001, stone);
      chimney.current.visible = stone > 0;
    }

    // 06 · Piscina, terrassa, jardí i capvespre.
    // El vas és de formigó fins que s'hi posa el gresite, just abans d'omplir-lo.
    poolMat.current?.color.copy(CONCRETE).lerp(POOL_TILE, easeInOut(segment(p, [BEATS.terrace[0], BEATS.water[0] + 0.02])));
    if (water.current) {
      const fill = easeInOut(s(p, "water"));
      water.current.visible = fill > 0;
      water.current.position.y = MathUtils.lerp(-POOL.depth + 0.04, -0.12, fill);
    }
    if (waterMat.current) waterMat.current.emissiveIntensity = 0.12 + dusk * 1.1;

    const terraceT = s(p, "terrace");
    if (coping.current) {
      const rise = easeOutCubic(segment(terraceT, [0, 0.3]));
      coping.current.scale.y = Math.max(0.0001, rise);
      coping.current.visible = rise > 0;
    }
    if (pavers.current) {
      tiles.forEach((tile, index) => {
        const t = stagger(terraceT, index, tiles.length, 0.9);
        if (t <= 0) matrix.makeScale(0, 0, 0);
        else matrix.compose(position.set(tile.x, 0.03 + (1 - easeOutBounce(t)) * 1.4, tile.z), identity, unit);
        pavers.current!.setMatrixAt(index, matrix);
      });
      pavers.current.instanceMatrix.needsUpdate = true;
    }

    const gardenT = s(p, "garden");
    if (palm.current) {
      const grow = easeOutBack(stagger(gardenT, 0, 4, 0.6));
      palm.current.scale.setScalar(Math.max(0.0001, grow));
      palm.current.visible = grow > 0;
    }
    if (umbrella.current) {
      const open = easeOutBack(stagger(gardenT, 1, 4, 0.6));
      umbrella.current.scale.set(Math.max(0.0001, open), Math.max(0.0001, Math.min(1, open * 1.4)), Math.max(0.0001, open));
      umbrella.current.visible = open > 0;
    }
    if (loungers.current) {
      const drop = easeOutCubic(stagger(gardenT, 2, 4, 0.6));
      loungers.current.position.y = (1 - drop) * 2;
      loungers.current.visible = drop > 0;
    }
    if (hedge.current) {
      const grow = easeOutCubic(stagger(gardenT, 3, 4, 0.6));
      hedge.current.scale.y = Math.max(0.0001, grow);
      hedge.current.visible = grow > 0;
    }
    const mesh = shrubMesh.current;
    if (mesh) {
      const shrubsT = stagger(gardenT, 3, 4, 0.6);
      shrubs.forEach((shrub, index) => {
        const grow = easeOutBack(stagger(shrubsT, index, shrubs.length, 0.7));
        dummy.position.set(shrub.x, shrub.r * 0.7 * grow, shrub.z);
        dummy.scale.set(shrub.r * grow, shrub.r * 0.85 * grow, shrub.r * grow);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (!shrubColored.current) mesh.setColorAt(index, tmpColor.setHSL(0.27 + shrub.tint * 0.06, 0.35, 0.3 + shrub.tint * 0.1));
      });
      dummy.scale.set(1, 1, 1);
      mesh.instanceMatrix.needsUpdate = true;
      if (!shrubColored.current && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
        shrubColored.current = true;
      }
    }

    glowMaterial.opacity = dusk * 0.9;
    fireMaterial.opacity = dusk;
    lampMaterial.opacity = dusk;
  });

  const chimneyX = (CHIMNEY.x[0] + CHIMNEY.x[1]) / 2;
  const chimneyZ = (CHIMNEY.z[0] + CHIMNEY.z[1]) / 2;
  const poolX = (POOL.x[0] + POOL.x[1]) / 2;
  const poolZ = (POOL.z[0] + POOL.z[1]) / 2;
  const poolW = POOL.x[1] - POOL.x[0];
  const poolD = POOL.z[1] - POOL.z[0];

  return (
    <>
      <fog ref={fog} attach="fog" args={[PAPER.getHex(), 45, 150]} />
      <hemisphereLight ref={hemi} args={["#dfeaf5", "#b9a68c", 1.25]} />
      <directionalLight
        ref={sun}
        position={[9, 16, 11]}
        intensity={2.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />

      {/* Terra: paper de plànol que es torna terreny, amb el forat de la piscina tapat fins a l'excavació. */}
      <mesh geometry={geo.ground} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial ref={groundMat} color={PAPER} roughness={1} />
      </mesh>
      <mesh ref={lid} rotation-x={-Math.PI / 2} position={[poolX, 0.002, poolZ]}>
        <planeGeometry args={[poolW + 0.02, poolD + 0.02]} />
        <meshStandardMaterial ref={lidMat} color={PAPER} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]} renderOrder={2}>
        <planeGeometry args={[24, 24]} />
        <meshBasicMaterial ref={planMat} map={textures.plan} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={geo.ghost} renderOrder={3}>
        <lineBasicMaterial ref={ghostMat} color="#0b62ad" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </lineSegments>

      {/* Vas de la piscina: una caixa vista per dins. */}
      <mesh position={[poolX, -POOL.depth / 2, poolZ]} receiveShadow>
        <boxGeometry args={[poolW, POOL.depth, poolD]} />
        <meshStandardMaterial ref={poolMat} color={CONCRETE} roughness={0.7} side={BackSide} />
      </mesh>
      <mesh ref={water} rotation-x={-Math.PI / 2} position={[poolX, -0.12, poolZ]} visible={false}>
        <planeGeometry args={[poolW - 0.02, poolD - 0.02]} />
        <meshStandardMaterial ref={waterMat} color="#38c2d6" emissive="#1fb8d0" emissiveIntensity={0.12} roughness={0.15} metalness={0.1} transparent opacity={0.86} />
      </mesh>

      {/* Fonaments. */}
      <group ref={foundation} visible={false}>
        <mesh geometry={geo.foundation} castShadow receiveShadow>
          <meshStandardMaterial color="#a9a49c" roughness={0.95} />
        </mesh>
      </group>

      {/* Estructura: pilars (en instàncies) i forjat. */}
      <instancedMesh ref={columns} args={[geo.column, undefined, COLUMNS.length]} castShadow>
        <meshStandardMaterial color="#b7b2aa" roughness={0.9} />
      </instancedMesh>
      <group ref={deck} visible={false}>
        <mesh geometry={geo.deck} castShadow receiveShadow>
          <meshStandardMaterial color="#c4bfb6" roughness={0.9} />
        </mesh>
      </group>

      {/* Façanes: maó, arrebossat blanc i fusteria, dins el grup que «explota». */}
      {geo.facades.map(({ facade, openings, brick, render }, index) => (
        <group key={facade.id} ref={(element) => void (facadeGroups.current[index] = element)}>
          <group ref={(element) => void (brickGroups.current[index] = element)} position-y={FLOOR} visible={false}>
            <mesh geometry={brick} castShadow receiveShadow>
              <meshStandardMaterial map={textures.brick} roughness={0.95} />
            </mesh>
          </group>
          <group ref={(element) => void (renderGroups.current[index] = element)} position-y={FLOOR} visible={false}>
            <mesh geometry={render} castShadow receiveShadow>
              <meshStandardMaterial color="#f5f2ec" roughness={0.92} />
            </mesh>
          </group>
          <group ref={(element) => void (windowGroups.current[index] = element)} visible={false}>
            {openings.map((opening, k) => (
              <WindowFrame key={k} opening={opening} facade={facade} />
            ))}
          </group>
        </group>
      ))}

      {/* Instal·lacions: aigua freda (blau), calenta (vermell) i electricitat (groc), els colors del logotip. */}
      <instancedMesh ref={pipeCold} args={[undefined, undefined, pipes.cold.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#0b6ec0" roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={pipeHot} args={[undefined, undefined, pipes.hot.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#d8262a" roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={pipePower} args={[undefined, undefined, pipes.power.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#f4c21c" roughness={0.5} />
      </instancedMesh>

      {/* Coberta: teula àrab a quatre aigües, carener i ampit de l'ala. */}
      <group ref={roof} visible={false}>
        <mesh geometry={geo.roof} castShadow receiveShadow>
          <meshStandardMaterial map={textures.roof} roughness={0.85} side={DoubleSide} />
        </mesh>
        {RIDGES.map((ridge, k) => (
          <mesh key={k} position={ridge.mid} quaternion={ridge.rotation} castShadow>
            <cylinderGeometry args={[0.11, 0.11, ridge.length, 10]} />
            <meshStandardMaterial color="#a8492a" roughness={0.8} />
          </mesh>
        ))}
      </group>
      <mesh ref={parapet} geometry={geo.parapet} castShadow visible={false}>
        <meshStandardMaterial color="#f5f2ec" roughness={0.92} />
      </mesh>

      {/* Xemeneia folrada de pedra, amb la llar de foc que s'encén al capvespre. */}
      <group ref={chimney} position-y={FLOOR} visible={false}>
        <mesh geometry={geo.chimney} castShadow receiveShadow>
          <meshStandardMaterial map={textures.stone} roughness={0.95} />
        </mesh>
        <mesh position={[chimneyX, CHIMNEY.top - FLOOR + 0.1, chimneyZ]} castShadow>
          <boxGeometry args={[CHIMNEY.x[1] - CHIMNEY.x[0] + 0.1, 0.22, CHIMNEY.z[1] - CHIMNEY.z[0] + 0.1]} />
          <meshStandardMaterial color="#26211f" roughness={0.6} />
        </mesh>
        <mesh position={[chimneyX, 1.25, CHIMNEY.z[1] + 0.005]}>
          <planeGeometry args={[0.8, 0.42]} />
          <meshStandardMaterial color="#1c1615" roughness={0.9} />
        </mesh>
        <mesh position={[chimneyX, 1.22, CHIMNEY.z[1] + 0.01]} material={fireMaterial}>
          <planeGeometry args={[0.66, 0.3]} />
        </mesh>
      </group>

      {/* Terrassa de pedra calcària, en instàncies. */}
      <mesh ref={coping} geometry={geo.coping} receiveShadow castShadow visible={false}>
        <meshStandardMaterial color="#efe6d6" map={textures.limestone} roughness={0.85} />
      </mesh>
      <instancedMesh ref={pavers} args={[undefined, undefined, tiles.length]} receiveShadow>
        <boxGeometry args={[0.97, 0.06, 0.97]} />
        <meshStandardMaterial map={textures.limestone} roughness={0.9} />
      </instancedMesh>

      {/* Jardí: palmera, para-sol, gandules, arbustos i bardissa. */}
      <group ref={palm} position={[-6.9, 0, 8.4]} visible={false}>
        <mesh castShadow>
          <tubeGeometry args={[geo.palmTrunk, 24, 0.16, 8, false]} />
          <meshStandardMaterial color="#8b735a" roughness={1} />
        </mesh>
        <group position={[0.85, 4.7, 0.2]}>
          {Array.from({ length: 11 }, (_, k) => (
            <mesh key={k} geometry={geo.frond} rotation={[0, (k / 11) * Math.PI * 2, -0.35 - (k % 3) * 0.18]} castShadow>
              <meshStandardMaterial color={k % 2 ? "#4c7a3a" : "#5d8c45"} roughness={0.9} side={DoubleSide} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={umbrella} position={[5.6, 0, 5.4]} visible={false}>
        <mesh position-y={1.2} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
          <meshStandardMaterial color="#e9e5df" roughness={0.6} />
        </mesh>
        <mesh position-y={2.45} castShadow>
          <coneGeometry args={[1.8, 0.5, 8, 1, true]} />
          <meshStandardMaterial color="#f3f0ea" roughness={0.9} side={DoubleSide} />
        </mesh>
      </group>
      <group ref={loungers} visible={false}>
        {[3.4, 4.6, 5.8].map((x) => (
          <mesh key={x} geometry={geo.lounger} position={[x, 0.06, 8.1]} rotation-y={Math.PI} castShadow receiveShadow>
            <meshStandardMaterial color="#d9d6d0" roughness={0.95} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={shrubMesh} args={[undefined, undefined, shrubs.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
      <group ref={hedge} position={[0.5, 0, -6.8]} visible={false}>
        <mesh position-y={0.65} castShadow receiveShadow>
          <boxGeometry args={[20, 1.3, 0.9]} />
          <meshStandardMaterial color="#4f6b3c" roughness={1} />
        </mesh>
      </group>

      {/* Llums de jardí. */}
      {[
        [TERRACE.x[0] + 0.2, TERRACE.z[1] - 0.2],
        [TERRACE.x[1] - 0.2, TERRACE.z[1] - 0.2],
        [TERRACE.x[1] - 0.2, TERRACE.z[0] + 0.3],
        [TERRACE.x[0] + 0.2, TERRACE.z[0] + 0.3],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x!, 0.3, z!]} material={lampMaterial}>
          <cylinderGeometry args={[0.07, 0.07, 0.6, 10]} />
        </mesh>
      ))}

      {/* Ombra suau sota la casa per assentar-la a terra. */}
      <mesh rotation-x={-Math.PI / 2} position={[0.5, 0.008, -1]} scale={[20, 15, 1]}>
        <planeGeometry />
        <meshBasicMaterial ref={shadowMat} map={textures.shadow} transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Bastiment negre, vidre fosc i un pla de llum càlida a dins, que s'encén al capvespre. */
function WindowFrame({ opening, facade }: { opening: Opening; facade: Facade }) {
  const { width: w, height: h } = opening;
  const profile = 0.07;
  const depth = 0.14;
  // El grup local mira cap a +z; es gira perquè miri cap a fora de la façana.
  const rotationY = facade.axis === "x" ? (facade.normal[2] > 0 ? 0 : Math.PI) : facade.normal[0] > 0 ? Math.PI / 2 : -Math.PI / 2;
  const mullions = w > 2 ? Math.round(w / 1.2) - 1 : 0;
  const bars: [number, number, number, number][] = [
    [0, h / 2 - profile / 2, w, profile],
    [0, -h / 2 + profile / 2, w, profile],
    [-w / 2 + profile / 2, 0, profile, h],
    [w / 2 - profile / 2, 0, profile, h],
    ...Array.from({ length: mullions }, (_, k): [number, number, number, number] => [-w / 2 + (w / (mullions + 1)) * (k + 1), 0, profile * 0.8, h]),
  ];
  return (
    <group position={[opening.center[0], opening.center[1], opening.center[2]]} rotation-y={rotationY}>
      {bars.map(([x, y, fw, fh], k) => (
        <mesh key={k} position={[x, y, 0.06]} castShadow>
          <boxGeometry args={[fw, fh, depth]} />
          <meshStandardMaterial color="#1d1b1b" roughness={0.45} metalness={0.2} />
        </mesh>
      ))}
      <mesh position-z={0.05}>
        <planeGeometry args={[w - profile, h - profile]} />
        <meshStandardMaterial color="#2c3e4e" roughness={0.08} metalness={0.5} transparent opacity={0.62} />
      </mesh>
      {/* La llum, just davant del vidre: al capvespre la finestra es veu encesa. */}
      <mesh position-z={0.056} material={glowMaterial}>
        <planeGeometry args={[w - profile, h - profile]} />
      </mesh>
    </group>
  );
}

export default function VillaScene(props: SceneProps) {
  return (
    <SceneCanvas fov={FOV}>
      <Villa {...props} />
    </SceneCanvas>
  );
}
