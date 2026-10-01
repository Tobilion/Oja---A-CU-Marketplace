import React, { useEffect, useMemo, useRef } from "react";
import { heroAvatars, tabletDroppedIds, type HeroAvatar } from "../../data/heroAvatars";
import { depthSize, useOrbit } from "../../hooks/useOrbit";

interface OrbitAvatarsProps {
  phoneRef: React.RefObject<HTMLDivElement | null>;
  paused: boolean;
  compact?: boolean;
}

export function useHeroBreakpoint(): "mobile" | "tablet" | "desktop" {
  const [bp, setBp] = React.useState<"mobile" | "tablet" | "desktop">(() =>
    typeof window === "undefined" ? "desktop" : window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"
  );
  React.useEffect(() => {
    const onResize = () => {
      setBp(window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}

// Mobile overlapping row. Static CSS float only, no orbit loop, no chips.
export const AvatarRow: React.FC = () => {
  const row = heroAvatars.slice(0, 10);
  return (
    <div className="flex items-center" aria-hidden="true">
      {row.map((a, i) => (
        <img
          key={a.id}
          src={a.src}
          alt={a.alt}
          width={512}
          height={512}
          decoding="async"
          loading="lazy"
          draggable={false}
          style={{ zIndex: row.length - i, animationDelay: `${(i % 5) * 0.35}s` }}
          className="w-11 h-11 rounded-full object-cover bg-[var(--color-surface)] border-2 border-[var(--color-surface)] shadow-md -ml-3 first:ml-0 animate-[hero-float_3.2s_ease-in-out_infinite]"
        />
      ))}
      <style>{`@keyframes hero-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );
};

export const OrbitAvatars: React.FC<OrbitAvatarsProps> = ({ phoneRef, paused, compact }) => {
  const bp = useHeroBreakpoint();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);

  const isTablet = bp === "tablet" || compact;
  const avatars: HeroAvatar[] = useMemo(() => {
    if (isTablet) return heroAvatars.filter((a) => !tabletDroppedIds.includes(a.id));
    return heroAvatars;
  }, [isTablet]);

  // Ellipse clears the phone frame: phone half-width is ~144px, so rx
  // stays well outside it even for the largest avatar.
  const rx = isTablet ? 196 : 232;
  const ry = isTablet ? 152 : 190;
  const sizeScale = isTablet ? 0.85 : 1;
  const enabled = bp !== "mobile";

  useOrbit({ rootRef, phoneRef, itemRefs, chipRefs, avatars, paused, rx, ry, sizeScale, enabled });

  // Chip pulse when the chat highlights an avatar id. Box-shadow only:
  // the orbit loop owns the chip transform, so it is never touched here.
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const idx = avatars.findIndex((a) => a.id === id);
      const chip = chipRefs.current[idx];
      if (!chip) return;
      chip.style.boxShadow = "0 0 0 3px var(--color-brand-primary), 0 8px 24px rgba(0,0,0,0.25)";
      window.setTimeout(() => {
        chip.style.boxShadow = "";
      }, 1600);
    };
    window.addEventListener("oja:hero-highlight", onHighlight);
    return () => window.removeEventListener("oja:hero-highlight", onHighlight);
  }, [avatars]);

  // Mobile uses AvatarRow instead, so no orbit loop runs there.
  if (!enabled) return null;

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0 pointer-events-none hidden md:block">
      {avatars.map((a, i) => {
        const px = Math.round(depthSize(a.depth) * a.scale * sizeScale);
        const eager = a.depth === 3;
        return (
          <div
            key={a.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 h-0 w-0 will-change-transform"
          >
            <img
              src={a.src}
              alt={a.alt}
              width={512}
              height={512}
              decoding="async"
              loading={eager ? "eager" : "lazy"}
              draggable={false}
              className="absolute rounded-full object-cover bg-[var(--color-surface)] shadow-[0_10px_22px_rgba(0,0,0,0.20)]"
              style={{
                width: px,
                height: px,
                left: -px / 2,
                top: -px / 2,
                filter: a.depth === 1 ? "blur(1px)" : undefined,
              }}
            />
            {a.chip && (
              <div
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                // Tubelight-pill styling from the portfolio nav: frosted
                // pill, tiny type, soft shadow. Position is written every
                // frame by the orbit loop (outward side of the avatar).
                className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[var(--color-text-main)] shadow-md will-change-transform"
                style={{ opacity: 0 }}
              >
                {a.chip}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
