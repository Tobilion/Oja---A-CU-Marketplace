import React from "react";
import { BadgeCheck } from "lucide-react";

interface PhoneMockupProps {
  sellerAvatarSrc: string;
  sellerName: string;
  status: string;
  outerRef?: React.RefObject<HTMLDivElement | null>;
  onHoverChange?: (hovering: boolean) => void;
  children: React.ReactNode;
}

// CSS-only phone frame. No brand imitation, theme follows Oja tokens.
export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  sellerAvatarSrc,
  sellerName,
  status,
  outerRef,
  onHoverChange,
  children,
}) => {
  return (
    <div
      ref={outerRef}
      role="img"
      aria-label="Example conversation between a buyer and a seller"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="relative w-[272px] sm:w-[288px] will-change-transform"
    >
      <div className="relative rounded-[2.6rem] border border-[var(--color-border)] bg-[var(--color-text-main)] p-[9px] shadow-[0_30px_70px_rgba(0,0,0,0.32)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--color-bg-base)]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-[var(--color-text-main)]">
            <span className="tabular-nums">9:41</span>
            <div className="absolute left-1/2 top-2.5 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1 text-[10px]" aria-hidden="true">
              <span>5G</span>
              <span className="inline-block h-2 w-4 rounded-[3px] border border-current opacity-70" />
            </span>
          </div>
          {/* Chat header */}
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-2.5 backdrop-blur">
            <img
              src={sellerAvatarSrc}
              alt=""
              width={512}
              height={512}
              decoding="async"
              className="h-9 w-9 rounded-full border border-[var(--color-border)] object-cover"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-[13px] font-bold text-[var(--color-text-main)]">
                <span className="truncate">{sellerName}</span>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand-primary)]" aria-label="Verified seller" />
              </p>
              <p className="text-[11px] text-[var(--color-brand-primary)]" aria-live="polite">
                {status}
              </p>
            </div>
          </div>
          {/* Chat body rendered by ChatSimulation */}
          <div className="h-[348px] sm:h-[364px]">{children}</div>
          {/* Home indicator */}
          <div className="flex justify-center bg-[var(--color-surface)] pb-2 pt-1">
            <div className="h-1 w-24 rounded-full bg-[var(--color-border)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
