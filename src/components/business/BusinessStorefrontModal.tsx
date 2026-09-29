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
  onUpdate?: (business: Business) => void;
}

export const BusinessStorefrontModal: React.FC<BusinessStorefrontModalProps> = ({
  business,
  listings,
  sellerMap,
  onClose,
  onSelectListing,
  onUpdate,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'reviews' | 'about' | 'manage'>('home');
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

  // Owner and membership management. Every action refreshes the business so
  // the panel always reflects the stored state.
  const isOwner = currentUser?.id === business.ownerId;
  const isMember = currentUser ? business.memberIds.includes(currentUser.id) : false;
  const isBlocked = currentUser ? (business.blockedMemberIds || []).includes(currentUser.id) : false;
  const hasJoinRequest = currentUser ? (business.joinRequests || []).includes(currentUser.id) : false;
  const [transferUsername, setTransferUsername] = useState('');

  const refreshBusiness = async () => {
    const fresh = await repo.getBusinessById(business.id);
    if (fresh) onUpdate?.(fresh);
  };

  const handleJoinAction = async (action: 'request' | 'approve' | 'decline', userId?: string) => {
    try {
      if (action === 'request' && currentUser) {
        await repo.requestJoinBusiness(business.id, currentUser.id);
        showToast('Join request sent. The owner will review it.', 'success');
      } else if (userId) {
        await repo.approveJoinBusiness(business.id, userId, action === 'approve');
        showToast(action === 'approve' ? 'Member approved.' : 'Join request declined.', 'info');
      }
      await refreshBusiness();
    } catch (err: any) {
      showToast(err?.message || 'Membership action failed', 'error');
    }
  };

  const handleBlockMember = async (memberId: string, blocked: boolean) => {
    try {
      if (blocked && !confirm('Block this member from posting under your brand?')) return;
      await repo.blockBusinessMember(business.id, memberId, blocked);
      showToast(blocked ? 'Member blocked from posting.' : 'Member unblocked.', 'info');
      await refreshBusiness();
    } catch (err: any) {
      showToast(err?.message || 'Member update failed', 'error');
    }
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = transferUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    const target = Object.values(sellerMap).find((u) => u.username.toLowerCase() === clean);
    if (!target) {
      showToast(`No student found with username @${clean}.`, 'error');
      return;
    }
    if (target.id === business.ownerId) {
      showToast('That student already owns this business.', 'error');
      return;
    }
    try {
      await repo.requestBusinessOwnershipTransfer(business.id, target.id);
      setTransferUsername('');
      showToast(`Transfer requested. ${target.fullName} must accept and an admin must approve.`, 'success');
      await refreshBusiness();
    } catch (err: any) {
      showToast(err?.message || 'Transfer request failed', 'error');
    }
  };

  const displayName = (id: string) => sellerMap[id]?.fullName || `Student ${id.slice(0, 6)}`;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div className="relative h-44 sm:h-52 w-full bg-neutral-900 overflow-hidden">
          <img
            src={business.banner || '/seed/banner-default.svg'}
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
                src={business.logo || '/seed/logo-default.svg'}
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

          {/* Tab Bar: Home, Products, Reviews, About (+ Manage for the owner) */}
          <div className="flex gap-6 text-xs font-semibold">
            {(['home', 'products', 'reviews', 'about', ...(isOwner ? ['manage' as const] : [])] as const).map((tab) => (
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
              {!isOwner && !isMember && !isBlocked && currentUser && (
                <button
                  onClick={() => handleJoinAction(hasJoinRequest ? 'decline' : 'request')}
                  disabled={hasJoinRequest}
                  className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {hasJoinRequest ? 'Join Request Pending' : 'Request to Join Team'}
                </button>
              )}
            </div>
          )}

          {/* MANAGE (owner only) */}
          {activeTab === 'manage' && isOwner && (
            <div className="space-y-5 text-xs max-w-lg">
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--color-text-main)]">
                  Join Requests ({(business.joinRequests || []).length})
                </h3>
                {(business.joinRequests || []).length === 0 ? (
                  <p className="text-[var(--color-text-muted)]">No pending join requests.</p>
                ) : (
                  (business.joinRequests || []).map((uid) => (
                    <div
                      key={uid}
                      className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[var(--color-text-main)]">
                        {displayName(uid)} <span className="font-mono font-normal text-[var(--color-text-muted)]">@{sellerMap[uid]?.username}</span>
                      </span>
                      <span className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleJoinAction('approve', uid)}
                          className="px-2.5 py-1 rounded bg-[var(--color-brand-primary)] text-white font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleJoinAction('decline', uid)}
                          className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]"
                        >
                          Decline
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--color-text-main)]">
                  Team Members ({business.memberIds.length})
                </h3>
                {business.memberIds.length === 0 ? (
                  <p className="text-[var(--color-text-muted)]">No members yet.</p>
                ) : (
                  business.memberIds.map((uid) => (
                    <div
                      key={uid}
                      className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[var(--color-text-main)]">
                        {displayName(uid)}
                        {uid === business.ownerId && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold">
                            Owner
                          </span>
                        )}
                      </span>
                      {uid !== business.ownerId && (
                        <button
                          onClick={() => handleBlockMember(uid, true)}
                          className="px-2.5 py-1 rounded border border-red-500/30 text-red-600 shrink-0"
                        >
                          Block
                        </button>
                      )}
                    </div>
                  ))
                )}
                {(business.blockedMemberIds || []).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h4 className="font-semibold text-[var(--color-text-muted)]">Blocked</h4>
                    {(business.blockedMemberIds || []).map((uid) => (
                      <div
                        key={uid}
                        className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2"
                      >
                        <span className="text-[var(--color-text-muted)]">{displayName(uid)}</span>
                        <button
                          onClick={() => handleBlockMember(uid, false)}
                          className="px-2.5 py-1 rounded border border-[var(--color-border)] shrink-0"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--color-text-main)]">Ownership Transfer</h3>
                {business.transferRequest?.status === 'pending' ? (
                  <p className="text-[var(--color-text-muted)]">
                    Transfer to {displayName(business.transferRequest.newOwnerId)} is awaiting admin approval.
                  </p>
                ) : (
                  <form onSubmit={handleTransferRequest} className="flex gap-2">
                    <input
                      value={transferUsername}
                      onChange={(e) => setTransferUsername(e.target.value)}
                      placeholder="New owner @username"
                      aria-label="New owner username"
                      className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-main)]"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold shrink-0"
                    >
                      Request Transfer
                    </button>
                  </form>
                )}
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  The nominated student is notified, and an admin must approve before ownership changes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
