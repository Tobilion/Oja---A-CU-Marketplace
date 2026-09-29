/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Search, ShieldCheck, Heart, Users, MapPin, Mail, Phone } from 'lucide-react';
import { Business, Listing, UserProfile } from '../../types';
import { ListingCard } from '../marketplace/ListingCard';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';

interface BusinessStorefrontModalProps {
  business: Business;
  listings: Listing[];
  sellerMap: Record<string, UserProfile>;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
}

export const BusinessStorefrontModal: React.FC<BusinessStorefrontModalProps> = ({
  business,
  listings,
  sellerMap,
  onClose,
  onSelectListing,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'reviews' | 'about'>('home');
  const [shopQuery, setShopQuery] = useState('');
  const [isFollowing, setIsFollowing] = useState(
    currentUser ? business.followerIds.includes(currentUser.id) : false
  );
  const [followerCount, setFollowerCount] = useState(business.followerIds.length);
  const modalRef = useModalEscape(true, onClose);

  const shopListings = listings.filter(
    (l) => (l.businessId === business.id || l.sellerId === business.ownerId) && l.status === 'active'
  );

  const filteredListings = shopQuery.trim()
    ? shopListings.filter(
        (l) =>
          l.title.toLowerCase().includes(shopQuery.toLowerCase()) ||
          l.description.toLowerCase().includes(shopQuery.toLowerCase())
      )
    : shopListings;

  const handleToggleFollow = async () => {
    if (!currentUser) return;
    const nowFollowing = await repo.toggleFollowBusiness(business.id, currentUser.id);
    setIsFollowing(nowFollowing);
    setFollowerCount((prev) => (nowFollowing ? prev + 1 : prev - 1));
    showToast(nowFollowing ? `Following @${business.handle}` : `Unfollowed @${business.handle}`, 'info');
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div className="relative h-44 sm:h-52 w-full bg-neutral-900 overflow-hidden">
          <img
            src={business.banner || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            aria-label="Close storefront"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storefront Header Lockup (Amazon style) */}
        <div className="px-6 pb-4 border-b border-[var(--color-border)] relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={business.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=biz'}
                alt=""
                className="w-24 h-24 rounded-2xl border-4 border-[var(--color-surface)] shadow-md bg-white object-cover shrink-0"
              />
              <div className="pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold font-display text-[var(--color-text-main)]">{business.name}</h1>
                  {business.status === 'approved' && (
                    <span title="Approved Campus Business">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] font-mono">@{business.handle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isFollowing
                    ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)]'
                    : 'bg-[var(--color-brand-primary)] text-white hover:opacity-90'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">({followerCount})</span>
              </button>
            </div>
          </div>

          {/* Shop Scoped Search Bar */}
          <div className="relative mb-3 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={shopQuery}
              onChange={(e) => setShopQuery(e.target.value)}
              placeholder={`Search in ${business.name}...`}
              className="w-full pl-8 pr-4 py-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-main)]"
            />
          </div>

          {/* Tab Bar: Home, Products, Reviews, About */}
          <div className="flex gap-6 text-xs font-semibold">
            {(['home', 'products', 'reviews', 'about'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {tab === 'products' ? `Products (${shopListings.length})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* HOME / PRODUCTS */}
          {(activeTab === 'home' || activeTab === 'products') && (
            <div className="space-y-6">
              {activeTab === 'home' && (
                <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs space-y-1">
                  <h3 className="font-semibold text-[var(--color-text-main)]">About {business.name}</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">{business.description}</p>
                </div>
              )}

              {filteredListings.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                  No products found in this storefront.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredListings.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      seller={sellerMap[item.sellerId]}
                      onClick={() => onSelectListing(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-[var(--color-text-main)]">Store Customer Feedback</h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Samuel A. (John Hall)</span>
                    <span className="text-amber-500">★★★★★ 5/5</span>
                  </div>
                  <p className="text-[var(--color-text-muted)]">
                    Original products, very fast room delivery. Definitely recommended.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs max-w-lg">
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--color-text-main)]">Contact & Logistics</h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">{business.description}</p>
                <div className="pt-2 space-y-1.5 text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{business.contact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>School Registration Status: {business.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
