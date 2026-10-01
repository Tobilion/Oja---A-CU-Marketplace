import React from "react";
import { ChevronRight } from "lucide-react";
import { avatarById } from "../../data/heroAvatars";
import type { ChatScene } from "../../data/heroChatScript";

interface HeroThreadListProps {
  scenes: ChatScene[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}

// iMessage-style thread list for the hero phone. Tapping a seller jumps
// straight into that conversation.
export const HeroThreadList: React.FC<HeroThreadListProps> = ({ scenes, activeIdx, onSelect }) => {
  return (
    <div className="h-full overflow-y-auto px-2 py-2">
      {scenes.map((scene, i) => {
        const avatar = avatarById(scene.sellerAvatarId);
        const preview = scene.items[0]?.kind !== "card" ? scene.items[0]?.text ?? "" : "";
        const active = i === activeIdx;
        return (
          <button
            key={scene.sellerAvatarId}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors ${
              active ? "bg-[var(--color-surface-subtle)]" : "hover:bg-[var(--color-surface-subtle)]/60"
            }`}
          >
            <img
              src={avatar?.src ?? "/avatars/laptop.webp"}
              alt=""
              width={512}
              height={512}
              decoding="async"
              className="h-10 w-10 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-bold text-[var(--color-text-main)]">
                  {scene.sellerName}
                </span>
                <span className="shrink-0 text-[9px] text-[var(--color-text-muted)]">now</span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
                {preview.length > 44 ? `${preview.slice(0, 44)}…` : preview}
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          </button>
        );
      })}
    </div>
  );
};
