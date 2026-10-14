import Image from "next/image";

/**
 * El logotip oficial del web actual (PNG de 646 × 291). `onDark` fa servir la versió preparada
 * per a fons fosc (`pnpm images`): nom en blanc i símbol amb contorn blanc.
 */
export function Logo({ onDark = false, className, priority = false }: { onDark?: boolean; className?: string; priority?: boolean }) {
  return (
    <Image
      src={onDark ? "/brand/logo-arenda-on-dark.png" : "/brand/logo-arenda.png"}
      alt="Arenda Construcciones"
      width={646}
      height={291}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
