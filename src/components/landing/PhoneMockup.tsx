import React from "react";
import { BadgeCheck, Plus } from "lucide-react";

interface PhoneMockupProps {
  sellerAvatarSrc: string;
  sellerName: string;
  status: string;
  outerRef?: React.RefObject<HTMLDivElement | null>;
  onHoverChange?: (hovering: boolean) => void;
  children: React.ReactNode;
}

// CSS-only phone frame styled after a clean stock messaging app.
// All colors follow the Oja theme tokens. No brand imitation.
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
      className="relative w-[264px] sm:w-[280px] will-change-transform"
    >
      <div className="relative rounded-[2.8rem] bg-[var(--color-text-main)] p-[8px] shadow-[0_24px_60px_rgba(0,0,0,0.30)]">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-[var(--color-bg-base)]">
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-[var(--color-text-main)]">
            <span className="tabular-nums">9:41</span>
            <div className="absolute left-1/2 top-2 h-[20px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1 text-[10px]" aria-hidden="true">
              <span className="flex items-end gap-[1.5px]">
                <span className="w-[2.5px] h-[4px] rounded-[1px] bg-current" />
                <span className="w-[2.5px] h-[6px] rounded-[1px] bg-current" />
                <span className="w-[2.5px] h-[8px] rounded-[1px] bg-current" />
                <span className="w-[2.5px] h-[10px] rounded-[1px] bg-current opacity-30" />
              </span>
              <span className="inline-block h-[10px] w-[20px] rounded-[3px] border border-current opacity-60" />
            </span>
          </div>
          {/* Contact header, centered like a stock messaging app */}
          <div className="flex flex-col items-center border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 pb-2 pt-1.5 backdrop-blur">
            <img
              src={sellerAvatarSrc}
              alt=""
              width={512}
              height={512}
              decoding="async"
              className="h-9 w-9 rounded-full border border-[var(--color-border)] object-cover"
            />
            <p className="mt-1 flex items-center gap-1 text-[12px] font-bold leading-tight text-[var(--color-text-main)]">
              <span className="max-w-[170px] truncate">{sellerName}</span>
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand-primary)]" aria-label="Verified seller" />
            </p>
            <p className="text-[10px] leading-tight text-[var(--color-brand-primary)]" aria-live="polite">
              {status}
            </p>
          </div>
          {/* Chat body rendered by ChatSimulation */}
          <div className="h-[330px] sm:h-[346px]">{children}</div>
          {/* Fake input bar for the messaging look. Decorative. */}
          <div aria-hidden="true" className="flex items-center gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-1 text-[11px] text-[var(--color-text-muted)]">
              iMessage
            </span>
          </div>
          {/* Home indicator */}
          <div className="flex justify-center bg-[var(--color-surface)] pb-1.5">
            <div className="h-1 w-24 rounded-full bg-[var(--color-border)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
