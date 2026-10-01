import React, { useState } from "react";
import { Search, SquarePen, X } from "lucide-react";
import type { ChatThread, UserProfile } from "../../types";
import { repo } from "../../data";

interface ThreadListProps {
  threads: ChatThread[];
  regularCount: number;
  requestCount: number;
  activeTab: "messages" | "requests";
  onTabChange: (tab: "messages" | "requests") => void;
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onSelect: (thread: ChatThread) => void;
}

// iMessage-style conversation list: search filters threads by partner name
// or @username, and the compose button starts a chat with anyone by name.
export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  regularCount,
  requestCount,
  activeTab,
  onTabChange,
  allUsers,
  currentUser,
  onSelect,
}) => {
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [starting, setStarting] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = q
    ? threads.filter((t) => {
        const p = allUsers.find((u) => u.id === t.participantIds.find((id) => id !== currentUser.id));
        return (
          p?.fullName.toLowerCase().includes(q) ||
          p?.username.toLowerCase().includes(q) ||
          t.lastMessageSnippet.toLowerCase().includes(q)
        );
      })
    : threads;

  const candidates = composing
    ? allUsers
        .filter((u) => u.id !== currentUser.id)
        .filter(
          (u) =>
            !q ||
            u.fullName.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  const startChat = async (user: UserProfile) => {
    if (starting) return;
    setStarting(true);
    try {
      const thread = await repo.ensureThread(currentUser.id, user.id);
      setComposing(false);
      setQuery("");
      onSelect(thread);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden text-xs">
      {/* Search + compose */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={composing ? "Search people by name or @username" : "Search chats or people"}
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] py-2 pl-9 pr-8 text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setComposing((c) => !c);
            setQuery("");
          }}
          aria-label="Start new chat"
          title="Start new chat"
          className={`shrink-0 rounded-full p-2.5 transition-colors ${
            composing
              ? "bg-[var(--color-brand-primary)] text-white"
              : "bg-[var(--color-surface-subtle)] text-[var(--color-brand-primary)] hover:bg-[var(--color-border)]"
          }`}
        >
          <SquarePen className="h-4 w-4" />
        </button>
      </div>

      {composing ? (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Start a chat
          </p>
          {candidates.length === 0 ? (
            <p className="py-10 text-center text-[var(--color-text-muted)]">
              {q ? `Nobody matches "${query}".` : "Type a name or @username above."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChat(u)}
                  disabled={starting}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-2.5 text-left transition-colors hover:border-[var(--color-brand-primary)] disabled:opacity-50"
                >
                  <img
                    src={u.avatarUrl || "/seed/avatar-default.svg"}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[var(--color-text-main)]">
                      {u.fullName}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                      @{u.username}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tabs: Messages vs Requests */}
          <div className="flex border-b border-[var(--color-border)] font-semibold">
            <button
              onClick={() => onTabChange("messages")}
              className={`flex-1 border-b-2 py-2.5 text-center transition-colors ${
                activeTab === "messages"
                  ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]"
                  : "border-transparent text-[var(--color-text-muted)]"
              }`}
            >
              Messages ({regularCount})
            </button>
            <button
              onClick={() => onTabChange("requests")}
              className={`flex-1 border-b-2 py-2.5 text-center transition-colors ${
                activeTab === "requests"
                  ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]"
                  : "border-transparent text-[var(--color-text-muted)]"
              }`}
            >
              Requests ({requestCount})
            </button>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {visible.length === 0 ? (
              <p className="py-12 text-center text-[var(--color-text-muted)]">
                {q ? `No chats match "${query}".` : "No conversations here yet."}
              </p>
            ) : (
              visible.map((th) => {
                const partner = allUsers.find((u) => u.id === th.participantIds.find((id) => id !== currentUser.id));
                return (
                  <button
                    key={th.id}
                    onClick={() => onSelect(th)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-[var(--color-surface-subtle)]"
                  >
                    <img
                      src={partner?.avatarUrl || "/seed/avatar-default.svg"}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-[var(--color-text-main)]">
                          {partner?.fullName ?? "Unknown user"}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)]">
                          {new Date(th.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
                        {partner ? `@${partner.username} · ` : ""}{th.lastMessageSnippet}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
