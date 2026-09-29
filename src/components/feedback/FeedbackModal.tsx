/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Bug, HelpCircle, Lightbulb, Copy, Check } from 'lucide-react';
import { FeedbackType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';
import {
  buildFeedbackReport,
  copyFeedbackReport,
  feedbackMailtoUrl,
  feedbackWhatsAppUrl,
  logUserAction,
} from '../../utils/feedback';

interface FeedbackModalProps {
  context: string;
  onClose: () => void;
}

const TYPE_OPTIONS: { id: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { id: 'bug', label: 'Bug', icon: <Bug className="w-3.5 h-3.5" /> },
  { id: 'confusing', label: 'Confusing', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: 'idea', label: 'Idea', icon: <Lightbulb className="w-3.5 h-3.5" /> },
];

/**
 * 6.3 "Report issue or idea" form. Auto-captures context, offers WhatsApp /
 * email / copy sends, and also saves the report (locally in mock mode, to
 * the feedback table in Supabase mode) for the admin Feedback queue.
 */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ context, onClose }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const modalRef = useModalEscape(true, onClose);

  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const draftReport = () =>
    buildFeedbackReport(
      { type, message, contact },
      { personaName: currentUser?.fullName, context }
    );

  const requireMessage = () => {
    if (!message.trim()) {
      showToast('Describe the issue or idea first.', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!requireMessage()) return;
    setIsSaving(true);
    try {
      const r = draftReport();
      await repo.saveFeedback({
        type: r.type,
        message: r.message,
        contact: r.contact,
        personaName: r.personaName,
        route: r.route,
        context: r.context,
        appMode: r.appMode,
        appVersion: r.appVersion,
        browser: r.browser,
        viewport: r.viewport,
        timestamp: r.timestamp,
        breadcrumbs: r.breadcrumbs,
        lastError: r.lastError,
      });
      logUserAction(`feedback saved (${type})`);
      showToast('Report saved. Thank you!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not save the report', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!requireMessage()) return;
    try {
      await copyFeedbackReport(draftReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy failed in this browser.', 'error');
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-main)]">Report Issue or Idea</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600" aria-label="Close feedback">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setType(o.id)}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 border ${
                  type === o.id
                    ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, what confused you, or what should Oja do?"
            aria-label="Report message"
            className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)]"
          />

          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Name or contact for follow-up (optional)"
            aria-label="Contact (optional)"
            className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-main)]"
          />

          <p className="text-[11px] text-[var(--color-text-muted)]">
            Auto-attached: route, persona, app mode and version, browser and viewport, recent actions, last error.
            Never passwords or personal data.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={message.trim() ? feedbackWhatsAppUrl(draftReport()) : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!requireMessage()) e.preventDefault();
              }}
              className="px-2 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-center hover:bg-emerald-700"
            >
              WhatsApp
            </a>
            <a
              href={message.trim() ? feedbackMailtoUrl(draftReport()) : undefined}
              onClick={(e) => {
                if (!requireMessage()) e.preventDefault();
              }}
              className="px-2 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold text-center hover:opacity-90"
            >
              Email
            </a>
            <button
              onClick={handleCopy}
              className="px-2 py-2 rounded-lg border border-[var(--color-border)] font-semibold flex items-center justify-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] font-semibold disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save to Oja Feedback Queue'}
          </button>
        </div>
      </div>
    </div>
  );
};
