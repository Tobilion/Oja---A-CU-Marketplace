/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { ChatThread } from '../../types';
import { repo } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useModalEscape } from '../../hooks/useModalEscape';
import { ThreadList } from './ThreadList';
import { ThreadView } from './ThreadView';
import type { Order } from '../../types';

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

  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const modalRef = useModalEscape(isOpen, onClose);

  const loadThreads = async (preselectId?: string) => {
    if (!currentUser) return;
    const userThreads = await repo.getThreadsForUser(currentUser.id);
    // Most recent first so new conversations surface at the top.
    userThreads.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
    setThreads(userThreads);

    // Opening with a target user finds or creates the persisted thread, so
    // the conversation exists in recent chats from the first message.
    if (targetUserId && targetUserId !== currentUser.id) {
      const thread = await repo.ensureThread(currentUser.id, targetUserId);
      setSelectedThread(thread);
      if (!userThreads.some((t) => t.id === thread.id)) {
        setThreads([thread, ...userThreads]);
      }
    } else if (preselectId) {
      const kept = userThreads.find((t) => t.id === preselectId) || null;
      setSelectedThread(kept);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadThreads();
    } else {
      setSelectedThread(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser, targetUserId]);

  if (!isOpen) return null;

  const regularThreads = threads.filter((t) => !t.isRequest);
  const requestThreads = threads.filter((t) => t.isRequest);
  const displayThreads = activeTab === 'messages' ? regularThreads : requestThreads;

  const partner = selectedThread
    ? allUsers.find((u) => u.id === selectedThread.participantIds.find((id) => id !== currentUser?.id))
    : null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface)] h-full shadow-2xl flex flex-col border-l border-[var(--color-border)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Direct Messages</h2>
          </div>
          <button onClick={onClose} aria-label="Close messages" className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedThread && currentUser ? (
          <ThreadView
            thread={selectedThread}
            currentUser={currentUser}
            partner={partner}
            referencedOrder={referencedOrder}
            onBack={() => setSelectedThread(null)}
            onListChanged={() => loadThreads(selectedThread.id)}
          />
        ) : currentUser ? (
          <ThreadList
            threads={displayThreads}
            regularCount={regularThreads.length}
            requestCount={requestThreads.length}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allUsers={allUsers}
            currentUser={currentUser}
            onSelect={setSelectedThread}
          />
        ) : null}
      </div>
    </div>
  );
};
