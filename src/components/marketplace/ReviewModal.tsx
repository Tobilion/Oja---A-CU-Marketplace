/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import { repo } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface ReviewModalProps {
  listingId: string;
  subOrderId: string;
  orderId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  listingId,
  subOrderId,
  orderId,
  onClose,
  onSubmitted,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !comment.trim()) return;
    setIsSubmitting(true);
    try {
      await repo.createReview({
        listingId,
        subOrderId,
        orderId,
        reviewerId: currentUser.id,
        rating,
        comment: comment.trim(),
      });
      showToast('Thank you for reviewing your purchase!', 'success');
      onSubmitted();
      onClose();
    } catch {
      showToast('Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-main)]">Review Your Purchase</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-[var(--color-text-muted)] mb-1.5 font-medium text-center">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-500 hover:scale-110 transition-transform"
                >
                  <Star className={`w-6 h-6 ${rating >= star ? 'fill-amber-500' : 'text-neutral-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Your Feedback</label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the item condition, delivery speed, and communication with the seller?"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-5 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
