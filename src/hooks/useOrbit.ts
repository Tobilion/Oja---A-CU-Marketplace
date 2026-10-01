import { useEffect, useRef } from "react";
import type { HeroAvatar } from "../data/heroAvatars";

interface OrbitOptions {
  rootRef: React.RefObject<HTMLDivElement | null>;
  phoneRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Array<HTMLDivElement | null>>;
  chipRefs: React.RefObject<Array<HTMLDivElement | null>>;
  avatars: HeroAvatar[];
  paused: boolean;
  rx: number;
  ry: number;
}

// Display size per depth layer on desktop. Final size multiplies by avatar.scale.
const DEPTH_SIZE: Record<HeroAvatar["depth"], number> = { 3: 120, 2: 96, 1: 76 };

export function depthSize(depth: HeroAvatar["depth"]): number {
  return DEPTH_SIZE[depth];
}

export function useOrbit({ rootRef, phoneRef, itemRefs, chipRefs, avatars, paused, rx, ry }: OrbitOptions): void {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const geomRef = useRef({ rx, ry });
  geomRef.current = { rx, ry };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = itemRefs.current ?? [];
    const chips = chipRefs.current ?? [];

    // Reduced motion: fixed pleasant positions, no loop, no parallax.
    if (reduceMotion) {
      avatars.forEach((a, i) => {
        const el = items[i];
        if (!el) return;
        const angle = (i / Math.max(avatars.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * geomRef.current.rx;
        const y = Math.sin(angle) * geomRef.current.ry;
        const size = DEPTH_SIZE[a.depth] * a.scale;
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(size / 120).toFixed(3)})`;
        el.style.opacity = "1";
        el.style.zIndex = Math.sin(angle) > 0 ? "30" : "5";
        const chip = chips[i];
        if (chip) chip.style.opacity = Math.sin(angle) > 0 ? "1" : "0";
      });
      return;
    }

    let raf = 0;
    let visible = true;
    let tabVisible = !document.hidden;
    const phases = avatars.map((_, i) => (i / Math.max(avatars.length, 1)) * Math.PI * 2);
    const t0 = performance.now();
    // Pointer parallax state. Smoothed with lerp so rings trail softly.
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
      const { rx: crx, ry: cry } = geomRef.current;

      for (let i = 0; i < avatars.length; i++) {
        const a = avatars[i];
        const el = items[i];
        if (!el || !a) continue;
        const angle = (phases[i] ?? 0) + (elapsed / a.orbitSeconds) * Math.PI * 2;
        const s = Math.sin(angle);
        const front = s > 0;
        // Independent bob so avatars feel alive. Transform only.
        const bob = Math.sin(elapsed * (0.9 + (i % 5) * 0.18) + i * 1.7) * 5;
        const depthShift = a.depth === 3 ? 1 : a.depth === 2 ? 0.6 : 0.35;
        const x = Math.cos(angle) * crx + smoothPX * 14 * depthShift;
        const y = Math.sin(angle) * cry + bob + smoothPY * 10 * depthShift;
        const base = (DEPTH_SIZE[a.depth] * a.scale) / 120;
        const focus = front ? 1.06 : 0.92;
        el.style.transform =
          `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(base * focus).toFixed(3)})`;
        el.style.opacity = front ? "1" : "0.55";
        el.style.zIndex = front ? "30" : "5";
        const chip = chips[i];
        if (chip) chip.style.opacity = front ? "1" : "0";
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
  }, [rootRef, phoneRef, itemRefs, chipRefs, avatars, rx, ry]);
}
