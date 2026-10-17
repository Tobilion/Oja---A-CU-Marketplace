/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { ChatThread, Order } from '../types';
import { repo } from '../data';
import { useAuth } from '../context/AuthContext';
import { ThreadList } from '../components/chat/ThreadList';
import { ThreadView } from '../components/chat/ThreadView';
import { RouteFallback } from '../components/common/RouteFallback';
import { paths } from '../routes/paths';

/**
 * Direct messages as routes: /messages lists conversations and
 * /messages/:threadId deep-links one thread (an order reference arrives via
 * location state when the thread is opened from an order). The card keeps
 * the drawer's fixed-height, internally-scrolling layout; the height budget
 * accounts for the navbar and page padding.
 */
export const MessagesPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, allUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');

  const loadThreads = useCallback(async () => {
    if (!currentUser) return;
    const userThreads = await repo.getThreadsForUser(currentUser.id);
    // Most recent first so new conversations surface at the top.
    userThreads.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
    setThreads(userThreads);
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    (async () => {
      await loadThreads();
      if (cancelled) return;
      if (!threadId) {
        setActiveThread(null);
        setLoadState('ready');
        return;
      }
      const thread = await repo.getThreadById(threadId);
      if (cancelled) return;
      // A thread the signed-in user does not participate in is treated as
      // missing, matching what the database policies return.
      const visible = thread && currentUser && thread.participantIds.includes(currentUser.id);
      setActiveThread(visible ? thread : null);
      setLoadState(visible ? 'ready' : 'missing');
    })().catch((e) => {
      console.error('Failed to load messages', e);
      if (!cancelled) setLoadState('missing');
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, currentUser, loadThreads]);

  if (!currentUser) {
    return null;
  }

  if (loadState === 'loading') {
    return <RouteFallback />;
  }

  const referencedOrder = (location.state as { referencedOrder?: Order } | null)?.referencedOrder;

  const partner = activeThread
    ? allUsers.find((u) => u.id === activeThread.participantIds.find((id) => id !== currentUser.id))
    : null;

  const regularThreads = threads.filter((t) => !t.isRequest);
  const requestThreads = threads.filter((t) => t.isRequest);
  const displayThreads = activeTab === 'messages' ? regularThreads : requestThreads;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      <div className="mx-auto w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-11rem)] min-h-[420px]">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Direct Messages</h2>
          </div>
        </div>

        {threadId ? (
          loadState === 'missing' || !activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-text-muted)]">
                Conversation unavailable
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                This thread does not exist or belongs to another account.
              </p>
              <Link
                to={paths.messages}
                className="px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                All messages
              </Link>
            </div>
          ) : (
            <ThreadView
              thread={activeThread}
              currentUser={currentUser}
              partner={partner}
              referencedOrder={referencedOrder}
              onBack={() => navigate(paths.messages)}
              onListChanged={() => {
                void loadThreads();
              }}
            />
          )
        ) : (
          <ThreadList
            threads={displayThreads}
            regularCount={regularThreads.length}
            requestCount={requestThreads.length}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allUsers={allUsers}
            currentUser={currentUser}
            onSelect={(thread) => navigate(paths.messageThread(thread.id))}
          />
        )}
      </div>
    </div>
  );
};
