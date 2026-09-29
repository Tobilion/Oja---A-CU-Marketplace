/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { Listing, UserProfile } from '../../types';
import { formatNaira } from '../../utils/money';
import { useCart } from '../../context/CartContext';

interface ListingCardProps {
  listing: Listing;
  seller?: UserProfile;
  onClick: () => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  seller,
  onClick,
}) => {
  const { addToCart } = useCart();
  const isOutOfStock = listing.stock <= 0;
  const isVerified = seller?.badges.includes('Verified Seller');

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(listing, 1);
    }
  };

  return (
    <article
      onClick={onClick}
      className={`group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col ${
        isOutOfStock ? 'opacity-70' : ''
      }`}
    >
      {/* Product Image Slot */}
      <div className="relative aspect-4/3 w-full bg-[var(--color-surface-subtle)] overflow-hidden">
        <img
          src={listing.images[0] || 'https://placehold.co/600x450/png?text=Oja+Listing'}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {isOutOfStock ? (
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="text-white text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-black/60 rounded">
              Out of Stock
            </span>
          </div>
        ) : (
          /* Subtle Quick Add Button on Hover */
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-2.5 right-2.5 bg-[var(--color-surface)]/95 hover:bg-[var(--color-brand-primary)] hover:text-white text-[var(--color-text-main)] p-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-y-1 group-hover:translate-y-0"
            title="Quick add to cart"
            aria-label={`Add ${listing.title} to cart`}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card Content & Metadata */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Unboxed clean metadata line */}
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] font-medium mb-1">
            <span>{listing.condition}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {seller?.hallId.replace('hall_', '').toUpperCase() || 'CU'}
            </span>
            {isVerified && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--color-brand-primary)] flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-[var(--color-text-main)] line-clamp-2 leading-snug group-hover:text-[var(--color-brand-primary)] transition-colors">
            {listing.title}
          </h3>
        </div>

        {/* Price & Stock Baseline */}
        <div className="flex items-baseline justify-between pt-1 border-t border-[var(--color-border)]/60">
          <span className="text-base font-bold font-mono tabular-nums text-[var(--color-text-main)]">
            {formatNaira(listing.price)}
          </span>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
            {listing.stock > 0 ? `${listing.stock} in stock` : 'Sold out'}
          </span>
        </div>
      </div>
    </article>
  );
};
