// Trams rectes (canonades, tubs, carener) dibuixats amb un cilindre en instàncies: un sol draw call
// per color. Cada tram «creix» des del seu inici quan li toca, en l'ordre del recorregut.

import { Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import type { Polyline } from "../villa/villa-geometry";

export type Segment = { start: Vector3; dir: Vector3; length: number; from: number; to: number };

/**
 * Converteix polilínies en trams. `from`/`to` (0–1) diuen quan creix cada tram: cada línia
 * comença una mica després de l'anterior i, dins la línia, els trams van un darrere l'altre.
 */
export function buildSegments(lines: readonly Polyline[], lineStagger = 0.18): Segment[] {
  const segments: Segment[] = [];
  const window = Math.max(0.05, 1 - lineStagger * (lines.length - 1));
  lines.forEach((line, lineIndex) => {
    const start = lineIndex * lineStagger;
    const lengths = line.slice(1).map((point, index) => new Vector3(...point).distanceTo(new Vector3(...line[index]!)));
    const total = lengths.reduce((sum, value) => sum + value, 0) || 1;
    let walked = 0;
    lengths.forEach((length, index) => {
      const a = new Vector3(...line[index]!);
      const b = new Vector3(...line[index + 1]!);
      segments.push({
        start: a,
        dir: b.clone().sub(a).normalize(),
        length,
        from: start + (walked / total) * window,
        to: start + ((walked + length) / total) * window,
      });
      walked += length;
    });
  });
  return segments;
}

const UP = new Vector3(0, 1, 0);
const matrix = new Matrix4();
const rotation = new Quaternion();
const position = new Vector3();
const scale = new Vector3();

/** Col·loca cada instància segons quant ha crescut el seu tram (`t` de 0 a 1 per a tot el conjunt). */
export function updateSegments(mesh: InstancedMesh, segments: readonly Segment[], t: number, radius: number) {
  segments.forEach((segment, index) => {
    const grown = Math.min(1, Math.max(0, (t - segment.from) / Math.max(0.0001, segment.to - segment.from)));
    const length = segment.length * grown;
    if (length < 0.0005) {
      matrix.makeScale(0, 0, 0);
    } else {
      rotation.setFromUnitVectors(UP, segment.dir);
      position.copy(segment.dir).multiplyScalar(length / 2).add(segment.start);
      // Una mica més llarg que el tram perquè els colzes no deixin forats.
      scale.set(radius, length + radius, radius);
      matrix.compose(position, rotation, scale);
    }
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}
