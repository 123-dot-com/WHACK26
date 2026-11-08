import type { CSSProperties } from "react";

export type ChibiAnimation = "idle" | "walk" | "cheer" | "phone";

// Atlas: four columns and four rows. Each animation uses one complete row.
const animations = {
  idle: { row: 0, duration: "1400ms" },
  walk: { row: 1, duration: "480ms" },
  cheer: { row: 2, duration: "800ms" },
  phone: { row: 3, duration: "1800ms" },
} satisfies Record<ChibiAnimation, { row: number; duration: string }>;

interface ChibiSpriteProps {
  animation?: ChibiAnimation;
  size?: number;
  facing?: "left" | "right";
  label?: string;
  className?: string;
  paused?: boolean;
  frame?: number;
}

export default function ChibiSprite({ animation = "idle", size = 112, facing = "right", label,
  className = "", paused = false, frame = 0 }: ChibiSpriteProps) {
  const { row, duration } = animations[animation];
  const style = { "--sprite-size": `${size}px`, "--sprite-row": row,
    "--sprite-duration": duration, "--sprite-frame": Math.min(3, Math.max(0, frame)) } as CSSProperties;

  return <span className={`chibi-sprite ${className}`} style={style} data-animation={animation}
    data-facing={facing} data-paused={paused} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <span className="chibi-sprite__frames" />
  </span>;
}
