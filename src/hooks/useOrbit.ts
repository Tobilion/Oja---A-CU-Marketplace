import { useEffect, useRef } from "react";
import type { HeroAvatar } from "../data/heroAvatars";
import {
  DEPTH_SIZE,
  depthSize,
  avatarRadius,
  ringPosition,
} from "../utils/orbitMath";

export { depthSize };

interface OrbitOptions {
  rootRef: React.RefObject<HTMLDivElement | null>;
  phoneRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Array<HTMLDivElement | null>>;
  chipRefs: React.RefObject<Array<HTMLDivElement | null>>;
  avatars: HeroAvatar[];
  paused?: boolean;
  ring: { rx: number; ry: number };
  sizeScale: number;
  enabled: boolean;
}

export function useOrbit({ rootRef, phoneRef, itemRefs, chipRefs, avatars, paused, ring, sizeScale, enabled }: OrbitOptions): void {
  const pausedRef = useRef(paused ?? false);
  pausedRef.current = paused ?? false;
  const geomRef = useRef({ ring, sizeScale });
  geomRef.current = { ring, sizeScale };

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = itemRefs.current ?? [];
    const chips = chipRefs.current ?? [];
    const count = avatars.length;

    // Place every avatar once. Chips sit on the outward side of the phone
    // so they never cover the chat text.
    const placeStatic = () => {
      const { ring: rg, sizeScale: ss } = geomRef.current;
      avatars.forEach((a, i) => {
        const el = items[i];
        if (!el) return;
        const p = ringPosition(i, count, 0, rg);
        const s = p.s;
        const focus = 1 + 0.16 * s;
        el.style.transform = `translate3d(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px, 0) scale(${focus.toFixed(3)})`;
        el.style.opacity = (0.45 + 0.55 * ((s + 1) / 2)).toFixed(2);
        el.style.zIndex = s > 0 ? "30" : "5";
        const chip = chips[i];
        if (chip) {
          const hyp = Math.hypot(p.x, p.y) || 1;
          const dist = avatarRadius(a, ss) + 8;
          const fade = 0.35 + 0.65 * Math.min(1, Math.max(0, (s + 0.05) / 0.45));
          chip.style.transform = `translate(-50%, -50%) translate(${(p.x / hyp * dist).toFixed(0)}px, ${(p.y / hyp * dist).toFixed(0)}px) scale(${(0.8 + 0.2 * fade).toFixed(2)})`;
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

    // Chip fade from depth: full on the front, faint behind. Never fully
    // zero while the avatar shows, so every character keeps its label.
    const chipFade = (s: number) => 0.35 + 0.65 * Math.min(1, Math.max(0, (s + 0.05) / 0.45));

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !tabVisible || pausedRef.current) return;
      const elapsed = (now - t0) / 1000;
      // Gentle spring toward the pointer target.
      smoothPX += (targetPX - smoothPX) * 0.06;
      smoothPY += (targetPY - smoothPY) * 0.06;
      tiltRY += (targetPX * 5 - tiltRY) * 0.08;
      tiltRX += (-targetPY * 5 - tiltRX) * 0.08;
      const { ring: rg, sizeScale: ss } = geomRef.current;

      // First pass: positions for every avatar.
      const laid: Array<{ x: number; y: number; s: number } | null> = [];
      for (let i = 0; i < count; i++) {
        const a = avatars[i];
        if (!a) {
          laid.push(null);
          continue;
        }
        const p = ringPosition(i, count, elapsed, rg);
        const bob = Math.sin(elapsed * (0.9 + (i % 5) * 0.18) + i * 1.7) * 4;
        const depthShift = a.depth === 3 ? 1 : a.depth === 2 ? 0.6 : 0.35;
        laid.push({
          x: p.x + smoothPX * 12 * depthShift,
          y: p.y + bob + smoothPY * 8 * depthShift,
          s: p.s,
        });
      }

      // Second pass: write styles. Every avatar keeps its chip, riding
      // outward so it never covers chat text, fading with depth.
      for (let i = 0; i < count; i++) {
        const a = avatars[i];
        const el = items[i];
        const l = laid[i];
        if (!el || !a || !l) continue;
        const s = l.s;
        // Continuous depth: gradual growth swinging to the front middle,
        // gradual shrink going behind. Never snaps.
        const px = DEPTH_SIZE[a.depth] * a.scale * ss;
        const focus = 1 + 0.16 * s;
        el.style.transform =
          `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) scale(${focus.toFixed(3)})`;
        el.style.opacity = (0.45 + 0.55 * ((s + 1) / 2)).toFixed(2);
        el.style.zIndex = s > 0 ? "30" : "5";
        const chip = chips[i];
        if (chip) {
          const hyp = Math.hypot(l.x, l.y) || 1;
          const dist = px / 2 + 8;
          const fade = chipFade(s);
          chip.style.transform =
            `translate(-50%, -50%) translate(${(l.x / hyp * dist).toFixed(1)}px, ${(l.y / hyp * dist).toFixed(1)}px) scale(${(0.8 + 0.2 * fade).toFixed(2)})`;
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
  }, [rootRef, phoneRef, itemRefs, chipRefs, avatars, ring, sizeScale, enabled]);
}
