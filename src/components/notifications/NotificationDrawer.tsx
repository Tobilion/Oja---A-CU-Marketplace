/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Bell, CheckCircle2, Clock, Send, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { AppNotification } from '../../types';
import { useModalEscape } from '../../hooks/useModalEscape';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToOrder,
}) => {
  const { notifications, markAsRead } = useNotifications();
  const modalRef = useModalEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface)] h-full shadow-2xl flex flex-col border-l border-[var(--color-border)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telegram Integration Notice */}
        <div className="p-3 bg-sky-500/10 border-b border-sky-500/20 text-sky-950 dark:text-sky-200 text-xs flex items-center gap-2.5">
          <Send className="w-4 h-4 text-sky-500 shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Telegram Alert Service:</strong> Orders and delivery assignments are dispatched to your registered @handle.
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {notifications.length === 0 ? (
            <p className="text-center py-12 text-[var(--color-text-muted)]">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.linkId && onNavigateToOrder) {
                    onClose();
                    onNavigateToOrder(n.linkId);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  !n.read
                    ? 'bg-[var(--color-surface-subtle)] border-[var(--color-brand-primary)]/40'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-80'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-[var(--color-text-main)]">
                  <span>{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--color-brand-primary)]" />}
                </div>
                <p className="text-[var(--color-text-muted)] mt-1 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-neutral-400 font-mono mt-2 block">
                  {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
