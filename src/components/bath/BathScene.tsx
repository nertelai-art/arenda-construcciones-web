"use client";

// L'anatomia d'una reforma: un bany dels noranta, tallat com una casa de nines, es buida i es refà
// amb el scroll. El bany nou s'inspira en el de la foto de les seves obres: microciment, paret de
// còdols, banyera d'obra, moble de roure suspès, dues piques de pedra, aixetes negres, mampara i
// mirall retroil·luminat. Mateixes regles de rendiment que la vila.

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import {
  BoxGeometry,
  Color,
  LatheGeometry,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  Vector2,
  Vector3,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type InstancedMesh,
  type PointLight,
} from "three";
import { easeInCubic, easeInOut, easeOutBack, easeOutBounce, easeOutCubic, segment, stagger } from "@/lib/easing";
import { seededRandom } from "@/lib/random";
import { SceneCanvas } from "../three/SceneCanvas";
import { buildSegments, updateSegments } from "../three/segments";
import { bareWallTexture, microcementTexture, oakTexture, oldFloorTexture, oldTileTexture, pebbleTexture } from "../three/textures";
import type { Polyline } from "../villa/villa-geometry";
import { BEATS, cameraAt, glowAt } from "./bath-phases";

export type SceneProps = { progress: RefObject<number>; reducedMotion: boolean };

const SMOOTHING = 4.5;
const MAX_DELTA = 1 / 30;
const FOV = 32;

// La cambra: 4 × 3 m i 2,6 m d'alçada, amb la paret del fons a z = −1,5 i l'esquerra a x = −2.
const ROOM = { x: [-2, 2], z: [-1.5, 1.5], h: 2.6 } as const;
const BACK = ROOM.z[0];
const LEFT = ROOM.x[0];
/** Gruix de l'acabat nou (microciment, còdols): tapa les canonades, que van just davant del mur. */
const FINISH = 0.06;
const PIPE_Z = BACK + 0.03;
const PIPE_X = LEFT + 0.03;

const COOL = new Color("#e3ecf5");
const WARM = new Color("#ffe1b8");
const glowMaterial = new MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0, toneMapped: false });

// Temporals reutilitzats.
const dummy = new Object3D();
const axis = new Vector3();
const back = new Vector3();
const right = new Vector3();
const up = new Vector3();
const target = new Vector3();
const tmpColor = new Color();

const s = (p: number, beat: keyof typeof BEATS) => segment(p, BEATS[beat]);

type Chunk = { base: Vector3; normal: Vector3; size: Vector3; delay: number; spin: Vector3; border: boolean };

/** Les rajoles velles en peces de 2 × 2, a la paret del fons, a l'esquerra i a terra. */
function oldChunks() {
  const random = seededRandom(17);
  const wall: Chunk[] = [];
  const rows = 7;
  const tile = 0.3;
  const backCols = 13;
  const backW = (ROOM.x[1] - ROOM.x[0]) / backCols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < backCols; c++) {
      wall.push({
        base: new Vector3(ROOM.x[0] + backW * (c + 0.5), tile * (r + 0.5), BACK + 0.008),
        normal: new Vector3(0, 0, 1),
        size: new Vector3(backW - 0.004, tile - 0.004, 0.014),
        delay: random(),
        spin: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
        border: r === 4,
      });
    }
    for (let c = 0; c < 10; c++) {
      wall.push({
        base: new Vector3(LEFT + 0.008, tile * (r + 0.5), ROOM.z[0] + tile * (c + 0.5)),
        normal: new Vector3(1, 0, 0),
        size: new Vector3(0.014, tile - 0.004, tile - 0.004),
        delay: random(),
        spin: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
        border: r === 4,
      });
    }
  }
  const floor: Chunk[] = [];
  for (let c = 0; c < 8; c++) {
    for (let r = 0; r < 6; r++) {
      floor.push({
        base: new Vector3(ROOM.x[0] + 0.5 * (c + 0.5), 0.008, ROOM.z[0] + 0.5 * (r + 0.5)),
        normal: new Vector3(0, 1, 0),
        size: new Vector3(0.496, 0.014, 0.496),
        delay: random(),
        spin: new Vector3(random() - 0.5, 0, random() - 0.5).normalize(),
        border: false,
      });
    }
  }
  // L'ordre de caiguda, amb una mica d'atzar però de dalt a baix.
  wall.sort((a, b) => b.base.y - a.base.y + (a.delay - b.delay) * 0.9);
  floor.sort((a, b) => a.delay - b.delay);
  return { wall, floor };
}

const y0 = 0.04;
/** Canonades noves: aigua freda, calenta, desguàs i electricitat. */
const PIPES: Record<"cold" | "hot" | "drain" | "power", Polyline[]> = {
  cold: [
    [[-1.6, y0, PIPE_Z], [-1.6, 0.3, PIPE_Z], [0.06, 0.3, PIPE_Z], [0.06, 1.15, PIPE_Z]],
    [[0.06, 0.3, PIPE_Z], [0.7, 0.3, PIPE_Z], [0.7, 1.15, PIPE_Z]],
    [[0.7, 0.3, PIPE_Z], [1.55, 0.3, PIPE_Z], [1.55, 1.25, PIPE_Z]],
    [[-1.6, 0.3, PIPE_Z], [PIPE_X, 0.3, PIPE_Z], [PIPE_X, 0.3, -0.5], [PIPE_X, 0.75, -0.5]],
  ],
  hot: [
    [[-1.48, y0, PIPE_Z], [-1.48, 0.38, PIPE_Z], [0.16, 0.38, PIPE_Z], [0.16, 1.15, PIPE_Z]],
    [[0.16, 0.38, PIPE_Z], [0.8, 0.38, PIPE_Z], [0.8, 1.15, PIPE_Z]],
    [[0.8, 0.38, PIPE_Z], [1.65, 0.38, PIPE_Z], [1.65, 1.25, PIPE_Z]],
    [[-1.48, 0.38, PIPE_Z], [PIPE_X, 0.38, PIPE_Z], [PIPE_X, 0.38, -0.4], [PIPE_X, 0.75, -0.4]],
  ],
  drain: [
    [[1.6, y0, -0.85], [1.6, y0, -1.2], [0.4, y0, -1.2], [-1.0, y0, -1.2], [-1.0, y0, -0.3]],
    [[0.4, 0.62, PIPE_Z], [0.4, y0, PIPE_Z], [0.4, y0, -1.2]],
  ],
  power: [
    [[ROOM.x[1], 2.35, PIPE_Z], [0.4, 2.35, PIPE_Z], [0.4, 1.78, PIPE_Z]],
    [[0.4, 2.35, PIPE_Z], [-1.2, 2.35, PIPE_Z], [-1.2, 2.55, PIPE_Z]],
    [[1.0, 2.35, PIPE_Z], [1.0, 1.25, PIPE_Z]],
  ],
};

/** Pica de pedra (torn): perfil d'un bol baix amb el llavi arrodonit. */
function basinGeometry() {
  const points = [new Vector2(0, 0), new Vector2(0.11, 0), new Vector2(0.19, 0.04), new Vector2(0.21, 0.1), new Vector2(0.2, 0.14), new Vector2(0.17, 0.14), new Vector2(0.15, 0.06), new Vector2(0, 0.05)];
  return new LatheGeometry(points, 28);
}

function Bath({ progress, reducedMotion }: SceneProps) {
  const { invalidate, size } = useThree();
  const smooth = useRef(reducedMotion ? 1 : (progress.current ?? 0));

  const textures = useMemo(() => {
    const tile = oldTileTexture();
    const floor = oldFloorTexture();
    const bare = bareWallTexture();
    bare.repeat.set(1.5, 1);
    const micro = microcementTexture();
    const pebble = pebbleTexture();
    pebble.repeat.set(3, 2.6);
    const shower = pebbleTexture();
    shower.repeat.set(0.8, 1.2);
    const oak = oakTexture();
    return { tile, floor, bare, micro, pebble, shower, oak };
  }, []);

  const chunks = useMemo(() => oldChunks(), []);
  const pipes = useMemo(() => ({ cold: buildSegments(PIPES.cold, 0.15), hot: buildSegments(PIPES.hot, 0.15), drain: buildSegments(PIPES.drain, 0.3), power: buildSegments(PIPES.power, 0.2) }), []);
  const basin = useMemo(() => basinGeometry(), []);
  const unitBox = useMemo(() => new BoxGeometry(1, 1, 1), []);

  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const lamp = useRef<PointLight>(null);
  const wallTiles = useRef<InstancedMesh>(null);
  const floorTiles = useRef<InstancedMesh>(null);
  const oldFixtures = useRef<Group>(null);
  const pipeCold = useRef<InstancedMesh>(null);
  const pipeHot = useRef<InstancedMesh>(null);
  const pipeDrain = useRef<InstancedMesh>(null);
  const pipePower = useRef<InstancedMesh>(null);
  const floorFinish = useRef<Group>(null);
  const wallFinish = useRef<Group>(null);
  const mosaic = useRef<Group>(null);
  const tub = useRef<Group>(null);
  const vanity = useRef<Group>(null);
  const basinA = useRef<Group>(null);
  const basinB = useRef<Group>(null);
  const glass = useRef<Group>(null);
  const mirror = useRef<Group>(null);
  const bordersColored = useRef(false);

  useFrame((state, rawDelta) => {
    const goal = reducedMotion ? 1 : (progress.current ?? 0);
    smooth.current = MathUtils.damp(smooth.current, goal, SMOOTHING, Math.min(rawDelta, MAX_DELTA));
    if (Math.abs(smooth.current - goal) < 0.0004) smooth.current = goal;
    else invalidate();
    const p = smooth.current;
    const glow = glowAt(p);

    // Càmera, amb el bany desplaçat a la dreta del text (escriptori) o cap amunt (mòbil).
    const pose = cameraAt(p);
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(MathUtils.degToRad(FOV / 2));
    // En vertical, la casa ocupa gairebé tota l'amplada: el text va a dalt i a baix, no al costat.
    const fit = aspect < 0.8 ? pose.fit * 0.82 : pose.fit;
    const radius = fit / 2 / (tanHalf * Math.min(aspect, 1.45));
    back.set(Math.sin(pose.azimuth) * Math.cos(pose.elevation), Math.sin(pose.elevation), Math.cos(pose.azimuth) * Math.cos(pose.elevation));
    right.set(Math.cos(pose.azimuth), 0, -Math.sin(pose.azimuth));
    up.crossVectors(back, right).normalize();
    target.set(0, pose.targetY, -0.2);
    if (aspect > 1.1) target.addScaledVector(right, -2 * radius * tanHalf * aspect * 0.19);
    else target.addScaledVector(up, -2 * radius * tanHalf * 0.07);
    state.camera.position.copy(target).addScaledVector(back, radius);
    state.camera.lookAt(target);

    // Llum: freda i plana d'obra al principi, càlida quan s'encén el mirall.
    if (hemi.current) {
      hemi.current.color.copy(COOL).lerp(WARM, glow);
      hemi.current.intensity = MathUtils.lerp(1.15, 0.8, glow);
    }
    if (sun.current) sun.current.intensity = MathUtils.lerp(1.9, 1.3, glow);
    if (lamp.current) lamp.current.intensity = glow * 3.2;
    glowMaterial.opacity = glow;

    // 01–02 · L'estat d'abans i l'enderroc.
    const out = s(p, "oldOut");
    if (oldFixtures.current) {
      const children = oldFixtures.current.children;
      for (let index = 0; index < children.length; index++) {
        const t = easeInCubic(stagger(out, index, children.length, 0.5));
        const child = children[index]!;
        child.position.z = (child.userData.z as number) + t * 2.4;
        child.position.y = (child.userData.y as number) - t * 0.6;
        child.scale.setScalar(Math.max(0.0001, 1 - t));
        child.visible = t < 1;
      }
    }

    const off = s(p, "tilesOff");
    const wall = wallTiles.current;
    if (wall) {
      chunks.wall.forEach((chunk, index) => {
        const t = stagger(off, index, chunks.wall.length, 0.96);
        placeChunk(chunk, t);
        wall.setMatrixAt(index, dummy.matrix);
        if (!bordersColored.current) wall.setColorAt(index, tmpColor.set(chunk.border ? "#5f8fa6" : "#ffffff"));
      });
      wall.instanceMatrix.needsUpdate = true;
      if (!bordersColored.current && wall.instanceColor) {
        wall.instanceColor.needsUpdate = true;
        bordersColored.current = true;
      }
    }
    const floor = floorTiles.current;
    if (floor) {
      const floorT = segment(off, [0.45, 1]);
      chunks.floor.forEach((chunk, index) => {
        placeChunk(chunk, stagger(floorT, index, chunks.floor.length, 0.9));
        floor.setMatrixAt(index, dummy.matrix);
      });
      floor.instanceMatrix.needsUpdate = true;
    }

    // 03 · Instal·lacions noves. S'amaguen quan l'acabat les ha tapades.
    const pipesT = s(p, "pipes");
    const pipesOn = p >= BEATS.pipes[0] && p < BEATS.mosaic[1];
    const sets = [
      [pipeCold.current, pipes.cold, 0.022],
      [pipeHot.current, pipes.hot, 0.022],
      [pipeDrain.current, pipes.drain, 0.045],
      [pipePower.current, pipes.power, 0.016],
    ] as const;
    for (const [mesh, list, r] of sets) {
      if (!mesh) continue;
      mesh.visible = pipesOn;
      if (pipesOn) updateSegments(mesh, list, pipesT, r);
    }

    // 04 · Revestiments: el microciment s'estén des del racó i la paret de còdols puja.
    const floorSpread = easeInOut(s(p, "floor"));
    if (floorFinish.current) {
      floorFinish.current.scale.set(Math.max(0.0001, floorSpread), 1, Math.max(0.0001, floorSpread));
      floorFinish.current.visible = floorSpread > 0;
    }
    const wallsUp = easeInOut(s(p, "walls"));
    if (wallFinish.current) {
      wallFinish.current.scale.y = Math.max(0.0001, wallsUp);
      wallFinish.current.visible = wallsUp > 0;
    }
    const mosaicUp = easeInOut(s(p, "mosaic"));
    if (mosaic.current) {
      mosaic.current.scale.y = Math.max(0.0001, mosaicUp);
      mosaic.current.visible = mosaicUp > 0;
    }

    // 05 · Mobles i llum.
    const tubT = easeOutCubic(s(p, "tub"));
    if (tub.current) {
      tub.current.scale.y = Math.max(0.0001, tubT);
      tub.current.visible = tubT > 0;
    }
    const vanityT = s(p, "vanity");
    if (vanity.current) {
      vanity.current.position.y = (1 - easeOutBounce(vanityT)) * 1.6;
      vanity.current.visible = vanityT > 0;
    }
    const basinsT = s(p, "basins");
    for (const [ref, index] of [[basinA, 0], [basinB, 1]] as const) {
      if (!ref.current) continue;
      const t = stagger(basinsT, index, 2, 0.5);
      ref.current.position.y = (1 - easeOutBounce(t)) * 1.2;
      ref.current.visible = t > 0;
    }
    const glassT = easeOutCubic(s(p, "glass"));
    if (glass.current) {
      glass.current.scale.y = Math.max(0.0001, glassT);
      glass.current.visible = glassT > 0;
    }
    const mirrorT = easeOutBack(s(p, "mirror"));
    if (mirror.current) {
      mirror.current.scale.setScalar(Math.max(0.0001, mirrorT));
      mirror.current.visible = mirrorT > 0;
    }
  });

  const backWall = { w: ROOM.x[1] - ROOM.x[0] + 0.14, h: ROOM.h };
  return (
    <>
      <hemisphereLight ref={hemi} args={["#e3ecf5", "#4a403b", 1.15]} />
      <directionalLight
        ref={sun}
        position={[3.5, 5, 4.5]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <pointLight ref={lamp} position={[0.4, 1.75, -0.9]} color="#ffcf8a" intensity={0} distance={4.5} decay={2} />

      {/* La cambra tallada: llosa i dos murs amb el gruix a la vista. */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[ROOM.x[1] - ROOM.x[0] + 0.14, 0.16, ROOM.z[1] - ROOM.z[0] + 0.14]} />
        <meshStandardMaterial color="#8d857c" roughness={1} />
      </mesh>
      <mesh position={[(ROOM.x[0] + ROOM.x[1]) / 2 - 0.07, ROOM.h / 2, BACK - 0.07]} receiveShadow castShadow>
        <boxGeometry args={[backWall.w, backWall.h, 0.14]} />
        <meshStandardMaterial map={textures.bare} roughness={1} />
      </mesh>
      <mesh position={[LEFT - 0.07, ROOM.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.14, ROOM.h, ROOM.z[1] - ROOM.z[0]]} />
        <meshStandardMaterial map={textures.bare} roughness={1} />
      </mesh>

      {/* Abans: rajola petita, gres marró i els sanitaris vells. */}
      <instancedMesh ref={wallTiles} args={[unitBox, undefined, chunks.wall.length]} receiveShadow>
        <meshStandardMaterial map={textures.tile} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={floorTiles} args={[unitBox, undefined, chunks.floor.length]} receiveShadow>
        <meshStandardMaterial map={textures.floor} roughness={0.7} />
      </instancedMesh>
      <group ref={oldFixtures}>
        <OldFixture position={[-1.15, 0.28, -1.12]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.7, 0.56, 0.74]} />
            <meshStandardMaterial color="#f2f0ea" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.281, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1.5, 0.56]} />
            <meshStandardMaterial color="#d7dde0" roughness={0.3} />
          </mesh>
        </OldFixture>
        <OldFixture position={[0.75, 0, -1.25]}>
          <mesh position-y={0.36} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.72, 16]} />
            <meshStandardMaterial color="#efede7" roughness={0.4} />
          </mesh>
          <mesh position-y={0.8} castShadow>
            <boxGeometry args={[0.56, 0.16, 0.44]} />
            <meshStandardMaterial color="#f4f2ec" roughness={0.35} />
          </mesh>
        </OldFixture>
        <OldFixture position={[0.75, 1.5, BACK + 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.62, 0.04]} />
            <meshStandardMaterial color="#b48a5a" roughness={0.6} />
          </mesh>
          <mesh position-z={0.021}>
            <planeGeometry args={[0.42, 0.54]} />
            <meshStandardMaterial color="#9fb2bd" roughness={0.1} metalness={0.4} />
          </mesh>
        </OldFixture>
        <OldFixture position={[1.55, 0, -1.2]}>
          <mesh position-y={0.2} castShadow>
            <boxGeometry args={[0.38, 0.4, 0.5]} />
            <meshStandardMaterial color="#f1efe9" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.62, -0.18]} castShadow>
            <boxGeometry args={[0.42, 0.44, 0.16]} />
            <meshStandardMaterial color="#f1efe9" roughness={0.4} />
          </mesh>
        </OldFixture>
      </group>

      {/* Instal·lacions noves, amb els colors del logotip. */}
      <instancedMesh ref={pipeCold} args={[undefined, undefined, pipes.cold.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#0b6ec0" roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={pipeHot} args={[undefined, undefined, pipes.hot.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#d8262a" roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={pipeDrain} args={[undefined, undefined, pipes.drain.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial color="#8f969b" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={pipePower} args={[undefined, undefined, pipes.power.length]} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#f4c21c" roughness={0.5} />
      </instancedMesh>

      {/* Revestiments nous. El terra s'estén des del racó del fons a l'esquerra. */}
      <group ref={floorFinish} position={[ROOM.x[0], 0, ROOM.z[0]]} visible={false}>
        <mesh position={[(ROOM.x[1] - ROOM.x[0]) / 2, 0.04, (ROOM.z[1] - ROOM.z[0]) / 2]} receiveShadow>
          <boxGeometry args={[ROOM.x[1] - ROOM.x[0], 0.08, ROOM.z[1] - ROOM.z[0]]} />
          <meshStandardMaterial map={textures.micro} roughness={0.75} />
        </mesh>
        <mesh position={[ROOM.x[1] - ROOM.x[0] - 0.4, 0.083, 0.65]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[0.8, 1.3]} />
          <meshStandardMaterial map={textures.shower} roughness={0.8} />
        </mesh>
      </group>
      <group ref={wallFinish} visible={false}>
        <mesh position={[(ROOM.x[0] + ROOM.x[1]) / 2, ROOM.h / 2, BACK + FINISH / 2]} receiveShadow castShadow>
          <boxGeometry args={[ROOM.x[1] - ROOM.x[0], ROOM.h, FINISH]} />
          <meshStandardMaterial map={textures.micro} roughness={0.8} color="#ece6dc" />
        </mesh>
      </group>
      <group ref={mosaic} visible={false}>
        <mesh position={[LEFT + FINISH / 2, ROOM.h / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[FINISH, ROOM.h, ROOM.z[1] - ROOM.z[0]]} />
          <meshStandardMaterial map={textures.pebble} roughness={0.85} />
        </mesh>
      </group>

      {/* Banyera d'obra al llarg de la paret de còdols. */}
      <group ref={tub} visible={false}>
        <mesh position={[-1.58, 0.29, -0.55]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.5, 1.9]} />
          <meshStandardMaterial color="#f4f2ee" roughness={0.5} />
        </mesh>
        <mesh position={[-1.58, 0.545, -0.55]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.56, 1.72]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} />
        </mesh>
      </group>

      {/* Moble de roure suspès amb el sobre de pedra. */}
      <group ref={vanity} visible={false}>
        <mesh position={[0.4, 0.7, BACK + FINISH + 0.25]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.5, 0.5]} />
          <meshStandardMaterial map={textures.oak} roughness={0.7} />
        </mesh>
        <mesh position={[0.4, 0.97, BACK + FINISH + 0.25]} castShadow receiveShadow>
          <boxGeometry args={[1.34, 0.04, 0.52]} />
          <meshStandardMaterial color="#8e8a84" roughness={0.6} />
        </mesh>
        <mesh position={[0.4, 0.7, BACK + FINISH + 0.502]}>
          <planeGeometry args={[0.004, 0.46]} />
          <meshStandardMaterial color="#6b4a2c" />
        </mesh>
      </group>
      <group ref={basinA} visible={false}>
        <mesh geometry={basin} position={[0.08, 0.99, BACK + FINISH + 0.27]} castShadow>
          <meshStandardMaterial color="#7d7a74" roughness={0.85} />
        </mesh>
        <Tap x={0.08} />
      </group>
      <group ref={basinB} visible={false}>
        <mesh geometry={basin} position={[0.72, 0.99, BACK + FINISH + 0.27]} castShadow>
          <meshStandardMaterial color="#86827b" roughness={0.85} />
        </mesh>
        <Tap x={0.72} />
      </group>

      {/* Dutxa d'obra: mampara de vidre amb el tirant negre i el ruixador. */}
      <group ref={glass} visible={false}>
        <mesh position={[1.2, 1.1, -0.86]}>
          <boxGeometry args={[0.012, 2.04, 1.15]} />
          <meshStandardMaterial color="#d8e6ea" roughness={0.05} metalness={0.1} transparent opacity={0.28} />
        </mesh>
        <mesh position={[1.2, 2.13, -0.86]}>
          <boxGeometry args={[0.03, 0.03, 1.2]} />
          <meshStandardMaterial color="#1b1a1a" roughness={0.4} />
        </mesh>
        <mesh position={[1.62, 1.95, BACK + FINISH + 0.12]} castShadow>
          <boxGeometry args={[0.22, 0.02, 0.22]} />
          <meshStandardMaterial color="#1b1a1a" roughness={0.4} />
        </mesh>
        <mesh position={[1.62, 2.1, BACK + FINISH + 0.04]}>
          <boxGeometry args={[0.03, 0.3, 0.03]} />
          <meshStandardMaterial color="#1b1a1a" roughness={0.4} />
        </mesh>
        <mesh position={[1.62, 1.1, BACK + FINISH + 0.012]}>
          <boxGeometry args={[0.16, 0.22, 0.024]} />
          <meshStandardMaterial color="#1b1a1a" roughness={0.4} />
        </mesh>
      </group>

      {/* Mirall amb llum al darrere: el halo s'encén al final. */}
      <group ref={mirror} position={[0.4, 1.72, BACK + FINISH]} visible={false}>
        <mesh position-z={0.004} material={glowMaterial}>
          <planeGeometry args={[1.32, 0.86]} />
        </mesh>
        <mesh position-z={0.03}>
          <boxGeometry args={[1.18, 0.74, 0.02]} />
          <meshStandardMaterial color="#c9d4da" roughness={0.04} metalness={0.7} />
        </mesh>
      </group>
    </>
  );
}

/** Peça del bany vell: recorda la seva posició per poder-la treure i tornar a posar. */
function OldFixture({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  return (
    <group position={position} userData={{ y: position[1], z: position[2] }}>
      {children}
    </group>
  );
}

/** Aixeta negra encastada a la paret, sobre cada pica. */
function Tap({ x }: { x: number }) {
  return (
    <>
      <mesh position={[x, 1.2, BACK + FINISH + 0.07]} castShadow>
        <boxGeometry args={[0.03, 0.03, 0.14]} />
        <meshStandardMaterial color="#1b1a1a" roughness={0.35} />
      </mesh>
      <mesh position={[x, 1.2, BACK + FINISH + 0.006]}>
        <boxGeometry args={[0.1, 0.1, 0.012]} />
        <meshStandardMaterial color="#1b1a1a" roughness={0.35} />
      </mesh>
    </>
  );
}

/** Col·loca una rajola vella segons quant ha avançat la seva caiguda (deixa la matriu a `dummy`). */
function placeChunk(chunk: Chunk, t: number) {
  if (t >= 1) {
    dummy.scale.setScalar(0);
    dummy.position.set(0, -10, 0);
    dummy.updateMatrix();
    return;
  }
  const pop = easeOutCubic(Math.min(1, t * 2.5));
  const fall = Math.max(0, t - 0.15) / 0.85;
  dummy.position.copy(chunk.base).addScaledVector(chunk.normal, pop * (chunk.normal.y > 0 ? 0.25 : 0.45));
  dummy.position.y = Math.max(0.02, dummy.position.y - fall * fall * (chunk.base.y + 0.4));
  axis.copy(chunk.spin);
  dummy.quaternion.setFromAxisAngle(axis, t * 2.6);
  const shrink = 1 - easeInCubic(Math.max(0, (t - 0.7) / 0.3));
  dummy.scale.set(chunk.size.x * shrink, chunk.size.y * shrink, chunk.size.z * shrink);
  dummy.updateMatrix();
}

export default function BathScene(props: SceneProps) {
  return (
    <SceneCanvas fov={FOV}>
      <Bath {...props} />
    </SceneCanvas>
  );
}
