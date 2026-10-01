import React, { useEffect, useRef, useState } from "react";
import {
  Ban,
  CheckCheck,
  ChevronLeft,
  Package,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { ChatMessage, ChatThread, Order, UserProfile } from "../../types";
import { repo } from "../../data";
import { useNotifications } from "../../context/NotificationContext";
import { formatNaira } from "../../utils/money";
import { formatHallName } from "../../utils/formatHall";

interface ThreadViewProps {
  thread: ChatThread;
  currentUser: UserProfile;
  partner?: UserProfile | null;
  referencedOrder?: Order;
  onBack: () => void;
  onListChanged: () => void;
}

// One iMessage-style conversation: centered partner header, bubble tails,
// order cards, agent accept/defer, block and report.
export const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  currentUser,
  partner,
  referencedOrder,
  onBack,
  onListChanged,
}) => {
  const { showToast } = useNotifications();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    repo.getMessages(thread.id).then(setMessages);
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    const otherId = thread.participantIds.find((id) => id !== currentUser.id) || "";
    setSending(true);
    try {
      const msg = await repo.sendMessage({
        threadId: thread.id,
        senderId: currentUser.id,
        receiverId: otherId,
        content,
        referencedOrderId: referencedOrder?.id,
        referencedOrderData: referencedOrder
          ? {
              orderNumber: referencedOrder.orderNumber,
              totalAmount: referencedOrder.totalAmount,
              status: referencedOrder.status,
              deliveryMode: referencedOrder.deliveryMode,
              buyerName: currentUser.fullName,
              buyerHall: formatHallName(currentUser.hallId, undefined, "short"),
            }
          : undefined,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      onListChanged();
    } catch {
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const agentResponse = async (msgId: string, orderId: string, action: "accept" | "defer") => {
    await repo.agentRespondToOrderReference(msgId, orderId, action);
    showToast(action === "accept" ? "Delivery accepted!" : "Delivery deferred", "info");
    repo.getMessages(thread.id).then(setMessages);
  };

  const block = async () => {
    await repo.blockUser(thread.id, currentUser.id);
    showToast("User blocked in this thread", "info");
    onBack();
    onListChanged();
  };

  const report = async () => {
    await repo.createReport({
      reporterId: currentUser.id,
      targetType: "chat_thread",
      targetId: thread.id,
      targetTitle: "Chat between users",
      reason: "Reported inappropriate conversation",
    });
    showToast("Conversation reported for admin review", "info");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden text-xs">
      {/* Partner header */}
      <div className="flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]/60 px-2 py-2">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-full p-1.5 text-[var(--color-brand-primary)] hover:bg-[var(--color-surface-subtle)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <img
            src={partner?.avatarUrl || "/seed/avatar-default.svg"}
            alt=""
            className="h-8 w-8 rounded-full border border-[var(--color-border)] object-cover"
          />
          <p className="mt-0.5 truncate text-[13px] font-bold leading-tight text-[var(--color-text-main)]">
            {partner?.fullName ?? "Unknown user"}
          </p>
          {partner && (
            <p className="font-mono text-[10px] leading-tight text-[var(--color-text-muted)]">
              @{partner.username} · {formatHallName(partner.hallId, undefined, "short")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={block} title="Block user" className="rounded-full p-1.5 text-neutral-400 hover:text-red-500">
            <Ban className="h-4 w-4" />
          </button>
          <button onClick={report} title="Report chat" className="rounded-full p-1.5 text-neutral-400 hover:text-amber-500">
            <ShieldAlert className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Message feed */}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-[var(--color-text-muted)]">
            No messages yet. Say hello{partner ? ` to ${partner.fullName.split(" ")[0]}` : ""}.
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const isAgent = currentUser.badges.includes("Delivery Agent");
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-[18px] px-3 py-1.5 leading-relaxed ${
                    isMe
                      ? "rounded-br-[5px] bg-[var(--color-brand-primary)] text-white"
                      : "rounded-bl-[5px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-main)]"
                  }`}
                >
                  <p>{m.content}</p>
                  {m.referencedOrderData && (
                    <div
                      className={`mt-2 space-y-2 rounded-xl border p-2.5 ${
                        isMe
                          ? "border-white/20 bg-black/20 text-white"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 font-mono">
                          <Package className="h-3.5 w-3.5" />
                          {m.referencedOrderData.orderNumber}
                        </span>
                        <span>{formatNaira(m.referencedOrderData.totalAmount)}</span>
                      </div>
                      <div className="text-[10px] opacity-80">
                        Destination: {m.referencedOrderData.buyerHall} ({m.referencedOrderData.buyerName})
                      </div>
                      {isAgent && !isMe && m.referencedOrderId && (
                        <div className="flex gap-2 border-t border-black/10 pt-1">
                          <button
                            type="button"
                            onClick={() => agentResponse(m.id, m.referencedOrderId!, "accept")}
                            className="flex-1 rounded bg-emerald-600 py-1 text-center font-bold text-white hover:bg-emerald-700"
                          >
                            Accept Run
                          </button>
                          <button
                            type="button"
                            onClick={() => agentResponse(m.id, m.referencedOrderId!, "defer")}
                            className="rounded bg-neutral-200 px-3 py-1 font-medium text-[var(--color-text-main)] dark:bg-neutral-800"
                          >
                            Defer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {isMe && (
                    <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] leading-none text-white/75">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                      <CheckCheck className="h-3 w-3" />
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-[var(--color-border)] p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={referencedOrder ? `Message about ${referencedOrder.orderNumber}...` : "iMessage"}
          className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-2 text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="shrink-0 rounded-full bg-[var(--color-brand-primary)] p-2.5 text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
