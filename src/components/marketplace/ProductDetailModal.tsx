/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Flag,
  Share2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Listing, UserProfile, Review, Business } from '../../types';
import { formatNaira } from '../../utils/money';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';

interface ProductDetailModalProps {
  listing: Listing;
  seller?: UserProfile;
  business?: Business;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenStorefront?: (businessId: string) => void;
  onOpenChatWith: (targetUserId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  listing,
  seller,
  business,
  onClose,
  onOpenProfile,
  onOpenStorefront,
  onOpenChatWith,
}) => {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Academic dishonesty / Exam fraud');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    repo.getReviewsForListing(listing.id).then(setReviews);
    repo.incrementListingViews(listing.id);
  }, [listing.id]);

  const isOutOfStock = listing.stock <= 0;
  const isVerified = seller?.badges.includes('Verified Seller');

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(listing, quantity);
    showToast(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`, 'success');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmittingReport(true);
    try {
      await repo.createReport({
        reporterId: currentUser.id,
        targetType: 'listing',
        targetId: listing.id,
        targetTitle: listing.title,
        reason: reportReason,
        details: reportDetails,
      });
      showToast('Report submitted for admin review', 'info');
      setShowReportModal(false);
    } catch {
      showToast('Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
            <span>{listing.condition}</span>
            <span aria-hidden="true">·</span>
            <span>{seller?.hallId.replace('hall_', '').toUpperCase()} Hall</span>
            {isVerified && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--color-brand-primary)] flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Campus Seller
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 text-[var(--color-text-muted)] hover:text-red-500 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Report item"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Gallery Left + Contiguous Purchase Module Right */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gallery Column */}
          <div className="space-y-4">
            <div className="relative aspect-4/3 w-full bg-[var(--color-surface-subtle)] rounded-xl overflow-hidden border border-[var(--color-border)]">
              <img
                src={listing.images[activeImageIdx] || 'https://placehold.co/600x450/png?text=Oja+Listing'}
                alt={listing.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {listing.images.length > 1 && (
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : listing.images.length - 1))}
                    className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 pointer-events-auto transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev < listing.images.length - 1 ? prev + 1 : 0))}
                    className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 pointer-events-auto transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIdx === i ? 'border-[var(--color-brand-primary)]' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            {/* Seller Micro Card */}
            <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
              <div
                onClick={() => seller && onOpenProfile(seller.id)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <img
                  src={seller?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=seller'}
                  alt=""
                  className="w-10 h-10 rounded-full border border-[var(--color-border)] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                    <span>{seller?.fullName}</span>
                    {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <span>★ {seller?.ratingAverage.toFixed(1) || '5.0'}</span>
                    <span>({seller?.ratingCount || 0} reviews)</span>
                    <span>·</span>
                    <span>{seller?.hallId.replace('hall_', '').toUpperCase()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {seller && (
                  <button
                    onClick={() => onOpenChatWith(seller.id)}
                    className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-border)] transition-colors"
                    title="Send direct message"
                    aria-label="Chat with seller"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
                {business && onOpenStorefront && (
                  <button
                    onClick={() => onOpenStorefront(business.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-brand-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    Storefront
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Contiguous Purchase Column */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold font-display text-[var(--color-text-main)] leading-snug">
                  {listing.title}
                </h1>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold font-mono tabular-nums text-[var(--color-text-main)]">
                    {formatNaira(listing.price)}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">
                    {listing.stock > 0 ? `${listing.stock} units available` : 'Currently out of stock'}
                  </span>
                </div>
              </div>

              {/* Dynamic Category Attributes */}
              {Object.keys(listing.dynamicValues).length > 0 && (
                <div className="py-3 border-y border-[var(--color-border)] grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(listing.dynamicValues).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[var(--color-text-muted)] capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                      <span className="font-semibold text-[var(--color-text-main)]">{v}</span>
                    </div>
                  ))}
                  <div>
                    <span className="text-[var(--color-text-muted)]">Delivery promise:</span>{' '}
                    <span className="font-semibold text-[var(--color-text-main)]">~{listing.defaultDeliveryDays} day(s)</span>
                  </div>
                </div>
              )}

              {/* Description Prose */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Description
                </h4>
                <p className="text-sm text-[var(--color-text-main)] leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {/* Verified Purchase Reviews */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Buyer Reviews ({reviews.length})
                  </h4>
                  {reviews.length > 0 && (
                    <span className="text-xs font-mono text-[var(--color-brand-primary)] font-medium">
                      ★ {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} / 5
                    </span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic">
                    No verified buyer reviews yet for this listing.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--color-text-main)]">★ {rev.rating}/5</span>
                          <span className="text-[10px] text-[var(--color-brand-primary)]">Verified Buyer</span>
                        </div>
                        <p className="text-[var(--color-text-muted)]">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Action Box */}
            <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="px-3 py-1.5 text-sm hover:bg-[var(--color-surface-subtle)] disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-mono font-bold tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(listing.stock, q + 1))}
                    disabled={quantity >= listing.stock || isOutOfStock}
                    className="px-3 py-1.5 text-sm hover:bg-[var(--color-surface-subtle)] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 py-3 px-4 bg-[var(--color-brand-primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Out of Stock' : `Add to Cart · ${formatNaira(listing.price * quantity)}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Modal Backdrop */}
        {showReportModal && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-1.5 text-red-600">
                  <Flag className="w-4 h-4" />
                  Report Listing
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Reason for report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
                  >
                    <option value="Academic dishonesty / Exam fraud">Academic dishonesty / Exam fraud / Leaked materials</option>
                    <option value="Prohibited substances / Alcohol / Drugs">Prohibited substances / Alcohol / Drugs</option>
                    <option value="Counterfeit or fraudulent item">Counterfeit or fraudulent item</option>
                    <option value="Misleading title or incorrect price">Misleading title or incorrect price</option>
                    <option value="Offensive or adult material">Offensive or adult material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Additional details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide context for moderation..."
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
