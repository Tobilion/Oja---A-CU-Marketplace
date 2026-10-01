import React, { useEffect, useMemo, useRef } from "react";
import { heroAvatars, tabletDroppedIds, type HeroAvatar } from "../../data/heroAvatars";
import { depthSize, useOrbit } from "../../hooks/useOrbit";

interface OrbitAvatarsProps {
  phoneRef: React.RefObject<HTMLDivElement | null>;
  paused: boolean;
  compact?: boolean;
}

function useBreakpoint(): "mobile" | "tablet" | "desktop" {
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
  const bp = useBreakpoint();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);

  const avatars: HeroAvatar[] = useMemo(() => {
    if (bp === "tablet" || compact) return heroAvatars.filter((a) => !tabletDroppedIds.includes(a.id));
    return heroAvatars;
  }, [bp, compact]);

  const rx = bp === "tablet" || compact ? 150 : 185;
  const ry = bp === "tablet" || compact ? 118 : 148;

  useOrbit({ rootRef, phoneRef, itemRefs, chipRefs, avatars, paused, rx, ry });

  // Chip pulse when the chat highlights an avatar id.
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const idx = avatars.findIndex((a) => a.id === id);
      const chip = chipRefs.current[idx];
      const item = itemRefs.current[idx];
      if (!chip || !item) return;
      chip.style.transition = "transform 0.3s ease, box-shadow 0.3s ease, opacity 0.4s ease";
      chip.style.transform = "translate(-50%, 6px) scale(1.12)";
      chip.style.boxShadow = "0 0 0 3px var(--color-brand-primary), 0 8px 24px rgba(0,0,0,0.25)";
      item.style.filter = "drop-shadow(0 0 14px var(--color-brand-primary))";
      window.setTimeout(() => {
        chip.style.transform = "translate(-50%, 6px) scale(1)";
        chip.style.boxShadow = "";
        item.style.filter = "";
      }, 1600);
    };
    window.addEventListener("oja:hero-highlight", onHighlight);
    return () => window.removeEventListener("oja:hero-highlight", onHighlight);
  }, [avatars]);

  // Mobile uses AvatarRow instead. This layer only renders on md+.
  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0 pointer-events-none hidden md:block">
      {avatars.map((a, i) => {
        const size = Math.round(depthSize(a.depth) * a.scale);
        const eager = a.depth === 3;
        return (
          <div
            key={a.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 will-change-transform"
            style={{ width: size, height: size + 30 }}
          >
            <img
              src={a.src}
              alt={a.alt}
              width={512}
              height={512}
              decoding="async"
              loading={eager ? "eager" : "lazy"}
              draggable={false}
              className="rounded-full object-cover bg-[var(--color-surface)] shadow-[0_14px_30px_rgba(0,0,0,0.22)] mx-auto"
              style={{
                width: size,
                height: size,
                filter: a.depth === 1 ? "blur(1px)" : undefined,
              }}
            />
            {a.chip && (
              <div
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                // Tubelight-pill styling borrowed from the portfolio nav:
                // frosted pill with a top glow when active.
                className="absolute left-1/2 top-full whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-main)] shadow-lg will-change-transform"
                style={{ transform: "translate(-50%, 6px)", opacity: 0 }}
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
