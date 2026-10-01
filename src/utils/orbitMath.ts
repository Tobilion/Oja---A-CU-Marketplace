import type { HeroAvatar } from "../data/heroAvatars";

// Pure orbit math, separate from React so it can be tested headlessly.
// ONE rigid ring: every avatar shares the same angular speed and even
// spacing, so spacing is constant and avatars can never bunch up.
// Display size per depth layer. Final px = depth size * avatar.scale * sizeScale.
export const DEPTH_SIZE: Record<HeroAvatar["depth"], number> = { 3: 72, 2: 58, 1: 46 };

// Full revolution in seconds. Slow enough to read chips, fast enough to
// feel alive. (heroAvatars.orbitSeconds is intentionally unused: per-avatar
// speeds lapped each other into piles. The field stays for documentation.)
export const RING_PERIOD_SECONDS = 50;

export function depthSize(depth: HeroAvatar["depth"]): number {
  return DEPTH_SIZE[depth];
}

// Half-size (radius) of an avatar in px at a given size scale.
export function avatarRadius(avatar: HeroAvatar, sizeScale: number): number {
  return (DEPTH_SIZE[avatar.depth] * avatar.scale * sizeScale) / 2;
}

export interface Ring {
  rx: number;
  ry: number;
}

// Small fixed radial offset per avatar, alternating sign, so neighbors do
// not sit on exactly the same radius. A few percent only.
export function radialOffset(index: number): number {
  return index % 2 === 0 ? 1.04 : 0.96;
}

export interface OrbitPoint {
  x: number;
  y: number;
  s: number; // sin(angle): +1 front middle, -1 back middle
}

// Position of avatar `index` of `count` at `elapsedSeconds` on `ring`.
// Spacing between neighbors is constant over time by construction.
export function ringPosition(
  index: number,
  count: number,
  elapsedSeconds: number,
  ring: Ring
): OrbitPoint {
  const angle = ((index / count) * Math.PI * 2 + (elapsedSeconds / RING_PERIOD_SECONDS) * Math.PI * 2) - Math.PI / 2;
  const off = radialOffset(index);
  return {
    x: Math.cos(angle) * ring.rx * off,
    y: Math.sin(angle) * ring.ry * off,
    s: Math.sin(angle),
  };
}
