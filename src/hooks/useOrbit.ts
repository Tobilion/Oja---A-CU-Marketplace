import { useEffect, useRef } from "react";
import type { HeroAvatar } from "../data/heroAvatars";

interface OrbitOptions {
  rootRef: React.RefObject<HTMLDivElement | null>;
  phoneRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Array<HTMLDivElement | null>>;
  chipRefs: React.RefObject<Array<HTMLDivElement | null>>;
  avatars: HeroAvatar[];
  paused?: boolean;
  radiusScale: number;
  sizeScale: number;
  enabled: boolean;
}

// Display size per depth layer. Sidehoe-style: modest memojis that stay
// clear of the phone frame. Final px = depth size * avatar.scale * sizeScale.
const DEPTH_SIZE: Record<HeroAvatar["depth"], number> = { 3: 84, 2: 66, 1: 52 };

// One ellipse lane per depth, as the brief specifies: depth 3 is the inner
// ring, depth 1 the outer ring. Separate lanes (instead of one shared
// ellipse) plus a locked speed per lane keep avatars from piling up.
const LANE: Record<HeroAvatar["depth"], { rx: number; ry: number; phase: number }> = {
  3: { rx: 188, ry: 156, phase: 0 },
  2: { rx: 218, ry: 182, phase: 0.55 },
  1: { rx: 244, ry: 204, phase: 1.1 },
};

export function depthSize(depth: HeroAvatar["depth"]): number {
  return DEPTH_SIZE[depth];
}

export function useOrbit({ rootRef, phoneRef, itemRefs, chipRefs, avatars, paused, radiusScale, sizeScale, enabled }: OrbitOptions): void {
  const pausedRef = useRef(paused ?? false);
  pausedRef.current = paused ?? false;
  const geomRef = useRef({ radiusScale, sizeScale });
  geomRef.current = { radiusScale, sizeScale };

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = itemRefs.current ?? [];
    const chips = chipRefs.current ?? [];

    // Even phases within each lane, so every lane starts (and, with a
    // locked speed per lane, stays) in a symmetric formation.
    const lanePos = new Map<HeroAvatar["depth"], number>();
    const laneCount = new Map<HeroAvatar["depth"], number>();
    for (const a of avatars) laneCount.set(a.depth, (laneCount.get(a.depth) ?? 0) + 1);
    const phases = avatars.map((a) => {
      const pos = lanePos.get(a.depth) ?? 0;
      lanePos.set(a.depth, pos + 1);
      const count = laneCount.get(a.depth) ?? 1;
      return (pos / count) * Math.PI * 2 + LANE[a.depth].phase - Math.PI / 2;
    });

    // Place every avatar once. Chips sit on the outward side of the phone
    // so they never cover the chat text.
    const placeStatic = () => {
      const { radiusScale: rs } = geomRef.current;
      avatars.forEach((a, i) => {
        const el = items[i];
        if (!el) return;
        const lane = LANE[a.depth];
        const angle = phases[i] ?? 0;
        const x = Math.cos(angle) * lane.rx * rs;
        const y = Math.sin(angle) * lane.ry * rs;
        const s = Math.sin(angle);
        const focus = 1 + 0.16 * s;
        el.style.transform = `translate3d(${x.toFixed(0)}px, ${y.toFixed(0)}px, 0) scale(${focus.toFixed(3)})`;
        el.style.opacity = (0.45 + 0.55 * ((s + 1) / 2)).toFixed(2);
        el.style.zIndex = s > 0 ? "30" : "5";
        const chip = chips[i];
        if (chip) {
          const hyp = Math.hypot(x, y) || 1;
          const px = DEPTH_SIZE[a.depth] * a.scale * geomRef.current.sizeScale;
          const dist = px / 2 + 15;
          const fade = Math.min(1, Math.max(0, (s + 0.05) / 0.45));
          chip.style.transform = `translate(-50%, -50%) translate(${(x / hyp * dist).toFixed(0)}px, ${(y / hyp * dist).toFixed(0)}px) scale(${(0.8 + 0.2 * fade).toFixed(2)})`;
          chip.style.opacity = fade.toFixed(2);
        }
      });
    };

    // Reduced motion: fixed pleasant positions, no loop, no parallax.
    if (reduceMotion) {
      placeStatic();
      return;
    }

    let raf = 0;
    let visible = true;
    let tabVisible = !document.hidden;
    const t0 = performance.now();
    // Pointer parallax state. Smoothed with lerp so rings trail softly.
    // Hover drives parallax only; nothing freezes on hover.
    let targetPX = 0;
    let targetPY = 0;
    let smoothPX = 0;
    let smoothPY = 0;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let tiltRX = 0;
    let tiltRY = 0;

    const onMove = (e: PointerEvent) => {
      if (!finePointer) return;
      const rect = root.getBoundingClientRect();
      if (rect.width === 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetPX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      targetPY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
    };
    const onLeave = () => {
      targetPX = 0;
      targetPY = 0;
    };
    const onVis = () => {
      tabVisible = !document.hidden;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 }
    );
    observer.observe(root);
    document.addEventListener("visibilitychange", onVis);
    if (finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !tabVisible || pausedRef.current) return;
      const elapsed = (now - t0) / 1000;
      // Gentle spring toward the pointer target.
      smoothPX += (targetPX - smoothPX) * 0.06;
      smoothPY += (targetPY - smoothPY) * 0.06;
      tiltRY += (targetPX * 5 - tiltRY) * 0.08;
      tiltRX += (-targetPY * 5 - tiltRX) * 0.08;
      const { radiusScale: rs, sizeScale: ss } = geomRef.current;

      for (let i = 0; i < avatars.length; i++) {
        const a = avatars[i];
        const el = items[i];
        if (!el || !a) continue;
        const lane = LANE[a.depth];
        const angle = (phases[i] ?? 0) + (elapsed / a.orbitSeconds) * Math.PI * 2;
        const s = Math.sin(angle);
        // Continuous depth: the avatar gradually grows as it swings round
        // to the front middle and shrinks as it goes behind, instead of
        // snapping between two sizes at the sides.
        const bob = Math.sin(elapsed * (0.9 + (i % 5) * 0.18) + i * 1.7) * 4;
        const depthShift = a.depth === 3 ? 1 : a.depth === 2 ? 0.6 : 0.35;
        const x = Math.cos(angle) * lane.rx * rs + smoothPX * 12 * depthShift;
        const y = Math.sin(angle) * lane.ry * rs + bob + smoothPY * 8 * depthShift;
        const px = DEPTH_SIZE[a.depth] * a.scale * ss;
        const focus = 1 + 0.16 * s;
        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${focus.toFixed(3)})`;
        el.style.opacity = (0.45 + 0.55 * ((s + 1) / 2)).toFixed(2);
        el.style.zIndex = s > 0 ? "30" : "5";
        const chip = chips[i];
        if (chip) {
          // Outward side: push the chip away from the phone center along
          // the radial direction, so it never covers the chat text.
          // The chip fades (never snaps) in step with the avatar shrinking.
          const hyp = Math.hypot(x, y) || 1;
          const dist = px / 2 + 15;
          const fade = Math.min(1, Math.max(0, (s + 0.05) / 0.45));
          chip.style.transform =
            `translate(-50%, -50%) translate(${(x / hyp * dist).toFixed(1)}px, ${(y / hyp * dist).toFixed(1)}px) scale(${(0.8 + 0.2 * fade).toFixed(2)})`;
          chip.style.opacity = fade.toFixed(2);
        }
      }
      const phone = phoneRef.current;
      if (phone && finePointer) {
        phone.style.transform = `perspective(900px) rotateX(${tiltRX.toFixed(2)}deg) rotateY(${tiltRY.toFixed(2)}deg)`;
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (finePointer) {
        window.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
      }
    };
  }, [rootRef, phoneRef, itemRefs, chipRefs, avatars, radiusScale, sizeScale, enabled]);
}
