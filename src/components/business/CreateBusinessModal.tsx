/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Building, Upload, AlertCircle } from 'lucide-react';
import { Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';

interface CreateBusinessModalProps {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  categories,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_electronics');
  const [contact, setContact] = useState('');
  const [membersPostFreely, setMembersPostFreely] = useState(true);
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const modalRef = useModalEscape(true, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);

    const cleanHandle = handle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (!name.trim()) {
      setErrorMsg('Please specify a business name.');
      return;
    }
    if (!cleanHandle) {
      setErrorMsg('Please specify a valid @handle for your shop.');
      return;
    }

    setIsSubmitting(true);
    try {
      await repo.createBusiness({
        name: name.trim(),
        handle: cleanHandle,
        description: description.trim(),
        logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanHandle}`,
        banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        categoryId,
        contact: contact.trim() || currentUser.telegramHandle,
        ownerId: currentUser.id,
        proofUrl: proofUrl || undefined,
        membersPostFreely,
        memberIds: [currentUser.id],
      });

      showToast(`Business "@${cleanHandle}" submitted for admin review!`, 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register business');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Register Campus Business</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!handle) setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
              }}
              placeholder="e.g. Eagle Tech Hub"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Store Handle (@)</label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 bg-[var(--color-border)] text-[var(--color-text-muted)] rounded-l-lg border border-r-0 border-[var(--color-border)] font-mono">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="eagletech"
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-r-lg p-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Contact / Telegram / WhatsApp</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +234 812 345 6789 or @davetech_cu"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your student business specialize in?"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
            />
          </div>

          {/* Member Posting Setting */}
          <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--color-text-main)]">
              <input
                type="checkbox"
                checked={membersPostFreely}
                onChange={(e) => setMembersPostFreely(e.target.checked)}
                className="accent-[var(--color-brand-primary)] rounded"
              />
              <span>Allow approved members to post products freely (Default YES)</span>
            </label>
            <p className="text-[11px] text-[var(--color-text-muted)] pl-5">
              You retain owner rights to block any individual member from posting under your brand.
            </p>
          </div>

          {/* School Registration Proof Upload */}
          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">
              CU Student Venture / Business Permit Proof (Optional)
            </label>
            <input
              type="text"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="Paste document image link or leave blank for pending review"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
