/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';

interface SellerApplyModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

export const SellerApplyModal: React.FC<SellerApplyModalProps> = ({
  onClose,
  onSubmitted,
}) => {
  const { currentUser, applyForSeller } = useAuth();
  const { showToast } = useNotifications();

  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTB)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(currentUser?.fullName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const modalRef = useModalEscape(true, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (accountNumber.trim().length !== 10) {
      setErrorMsg('Nigerian bank account numbers must be exactly 10 digits.');
      return;
    }
    if (!accountName.trim()) {
      setErrorMsg('Please specify account holder name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await applyForSeller({
        bankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });
      showToast('Seller application submitted! Admins will consider your request.', 'success');
      onSubmitted();
      onClose();
    } catch {
      setErrorMsg('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Apply for Seller Badge</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <p className="font-semibold text-xs">Seller Verification Notice</p>
            <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
              Your request will be considered by administrators. When approved, you will be able to publish listings and payouts for completed orders will be sent to these bank details.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Select Bank</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)]"
            >
              <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
              <option value="Access Bank">Access Bank</option>
              <option value="Zenith Bank">Zenith Bank</option>
              <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
              <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
              <option value="OPay">OPay</option>
              <option value="Palmpay">Palmpay</option>
              <option value="First Bank of Nigeria">First Bank of Nigeria</option>
              <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">
              Account Number (10 Digits)
            </label>
            <input
              type="text"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0123456789"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs font-mono font-bold tracking-wider"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">
              Account Name (Must match bank alert)
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Tobiloba Jagun"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs"
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
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
