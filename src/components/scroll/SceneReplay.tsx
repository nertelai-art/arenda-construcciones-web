import { Replay } from "../ui/icons";

/**
 * Botó per tornar a veure una escena guiada pel scroll. Només es veu quan l'escena ja s'ha acabat
 * i s'ha plegat (`[data-done] .scene-replay`, a globals.css).
 */
export function SceneReplay({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="scene-replay" aria-label={label} title={label} onClick={onClick}>
      <Replay />
    </button>
  );
}
