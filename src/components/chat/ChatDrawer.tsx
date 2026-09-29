/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  ShieldAlert,
  Ban,
  Check,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ChatThread, ChatMessage, UserProfile, Order } from '../../types';
import { repo } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatNaira } from '../../utils/money';
import { formatHallName } from '../../utils/formatHall';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string; // if opened directly to message someone
  referencedOrder?: Order; // if referencing an order
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  targetUserId,
  referencedOrder,
}) => {
  const { currentUser, allUsers } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const modalRef = useModalEscape(isOpen, onClose);

  const loadThreads = async () => {
    if (!currentUser) return;
    const userThreads = await repo.getThreadsForUser(currentUser.id);
    setThreads(userThreads);

    // If opened with target user, find or create thread
    if (targetUserId && targetUserId !== currentUser.id) {
      let thread = userThreads.find((t) => t.participantIds.includes(targetUserId));
      if (!thread) {
        thread = {
          id: `thread_${currentUser.id}_${targetUserId}`,
          participantIds: [currentUser.id, targetUserId],
          lastMessageSnippet: 'Started conversation',
          lastMessageAt: new Date().toISOString(),
          isRequest: true,
        };
      }
      setSelectedThread(thread);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen, currentUser, targetUserId]);

  useEffect(() => {
    if (selectedThread) {
      repo.getMessages(selectedThread.id).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [selectedThread]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedThread || !newContent.trim()) return;

    const otherId = selectedThread.participantIds.find((id) => id !== currentUser.id) || '';
    setIsSending(true);

    try {
      const msg = await repo.sendMessage({
        threadId: selectedThread.id,
        senderId: currentUser.id,
        receiverId: otherId,
        content: newContent.trim(),
        referencedOrderId: referencedOrder?.id,
        referencedOrderData: referencedOrder
          ? {
              orderNumber: referencedOrder.orderNumber,
              totalAmount: referencedOrder.totalAmount,
              status: referencedOrder.status,
              deliveryMode: referencedOrder.deliveryMode,
              buyerName: currentUser.fullName,
              buyerHall: formatHallName(currentUser.hallId, undefined, 'short'),
            }
          : undefined,
      });

      setMessages((prev) => [...prev, msg]);
      setNewContent('');
      await loadThreads();
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleAgentOrderResponse = async (msgId: string, orderId: string, action: 'accept' | 'defer') => {
    await repo.agentRespondToOrderReference(msgId, orderId, action);
    showToast(action === 'accept' ? 'Delivery accepted!' : 'Delivery deferred', 'info');
    if (selectedThread) {
      const updated = await repo.getMessages(selectedThread.id);
      setMessages(updated);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedThread || !currentUser) return;
    await repo.blockUser(selectedThread.id, currentUser.id);
    showToast('User blocked in this thread', 'info');
    setSelectedThread(null);
    await loadThreads();
  };

  const handleReportChat = async () => {
    if (!selectedThread || !currentUser) return;
    await repo.createReport({
      reporterId: currentUser.id,
      targetType: 'chat_thread',
      targetId: selectedThread.id,
      targetTitle: `Chat between users`,
      reason: 'Reported inappropriate conversation',
    });
    showToast('Conversation reported for admin review', 'info');
  };

  const regularThreads = threads.filter((t) => !t.isRequest);
  const requestThreads = threads.filter((t) => t.isRequest);
  const displayThreads = activeTab === 'messages' ? regularThreads : requestThreads;

  const otherUser = selectedThread
    ? allUsers.find((u) => u.id === selectedThread.participantIds.find((id) => id !== currentUser?.id))
    : null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface)] h-full shadow-2xl flex flex-col border-l border-[var(--color-border)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              {selectedThread && otherUser ? otherUser.fullName : 'Direct Messages'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedThread && (
              <>
                <button onClick={handleBlockUser} className="text-neutral-400 hover:text-red-500 p-1" title="Block user">
                  <Ban className="w-4 h-4" />
                </button>
                <button onClick={handleReportChat} className="text-neutral-400 hover:text-amber-500 p-1" title="Report chat">
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If thread is selected: Message Window */}
        {selectedThread ? (
          <div className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Back button */}
            <div className="p-2 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between">
              <button
                onClick={() => setSelectedThread(null)}
                className="text-[var(--color-brand-primary)] hover:underline font-medium"
              >
                ← Back to threads
              </button>
              {otherUser && (
                <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  @{otherUser.username} ({formatHallName(otherUser.hallId, undefined, 'short')})
                </span>
              )}
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No messages yet. Send a message to start.</p>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  const isDeliveryAgent = currentUser?.badges.includes('Delivery Agent');

                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl ${
                          isMe
                            ? 'bg-[var(--color-brand-primary)] text-white rounded-br-xs'
                            : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-bl-xs'
                        }`}
                      >
                        <p className="leading-relaxed">{m.content}</p>

                        {/* Order Reference Card inside Chat */}
                        {m.referencedOrderData && (
                          <div
                            className={`mt-2 p-2.5 rounded-xl border ${
                              isMe ? 'bg-black/20 border-white/20 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-main)]'
                            } space-y-2`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1 font-mono">
                                <Package className="w-3.5 h-3.5" />
                                {m.referencedOrderData.orderNumber}
                              </span>
                              <span>{formatNaira(m.referencedOrderData.totalAmount)}</span>
                            </div>
                            <div className="text-[10px] opacity-80">
                              Destination: {m.referencedOrderData.buyerHall} ({m.referencedOrderData.buyerName})
                            </div>

                            {/* Agent Action Triggers (Accept or Defer) */}
                            {isDeliveryAgent && !isMe && m.referencedOrderId && (
                              <div className="flex gap-2 pt-1 border-t border-black/10">
                                <button
                                  type="button"
                                  onClick={() => handleAgentOrderResponse(m.id, m.referencedOrderId!, 'accept')}
                                  className="flex-1 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-center"
                                >
                                  Accept Run
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAgentOrderResponse(m.id, m.referencedOrderId!, 'defer')}
                                  className="px-3 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-[var(--color-text-main)] font-medium"
                                >
                                  Defer
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--color-text-muted)] mt-1 px-1">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--color-border)] flex gap-2">
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
              />
              <button
                type="submit"
                disabled={isSending || !newContent.trim()}
                className="p-2.5 bg-[var(--color-brand-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Thread Lists */
          <div className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Tabs: Messages vs Requests */}
            <div className="flex border-b border-[var(--color-border)] font-semibold">
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                  activeTab === 'messages'
                    ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)]'
                }`}
              >
                Messages ({regularThreads.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                  activeTab === 'requests'
                    ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)]'
                }`}
              >
                Requests ({requestThreads.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {displayThreads.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No conversations here yet.</p>
              ) : (
                displayThreads.map((th) => {
                  const partnerId = th.participantIds.find((id) => id !== currentUser?.id);
                  const partner = allUsers.find((u) => u.id === partnerId);

                  return (
                    <div
                      key={th.id}
                      onClick={() => setSelectedThread(th)}
                      className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors flex items-center gap-3"
                    >
                      <img
                        src={partner?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=thread'}
                        alt=""
                        className="w-10 h-10 rounded-full border border-[var(--color-border)] object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-semibold text-[var(--color-text-main)] truncate">{partner?.fullName}</h4>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {new Date(th.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                          {th.lastMessageSnippet}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
