/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  MessageSquare,
  Flag,
  MapPin,
  Send,
  Star,
  Award,
  Edit3,
  Check,
} from 'lucide-react';
import { UserProfile, Listing, Hall, Gender } from '../../types';
import { ListingCard } from '../marketplace/ListingCard';
import { formatHallName } from '../../utils/formatHall';
import { isValidNigerianPhone, normalizeNigerianPhone } from '../../utils/phone';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ProfileModalProps {
  user: UserProfile;
  listings: Listing[];
  onClose: () => void;
  onOpenChatWith: (userId: string) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenSellerApply: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  listings,
  onClose,
  onOpenChatWith,
  onSelectListing,
  onOpenSellerApply,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useNotifications();

  const isSelf = currentUser?.id === user.id;
  const userListings = listings.filter((l) => l.sellerId === user.id && l.status === 'active');

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [roomNumber, setRoomNumber] = useState(user.roomNumber || '');
  const [telegramHandle, setTelegramHandle] = useState(user.telegramHandle || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [hallId, setHallId] = useState(user.hallId);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [hallsList, setHallsList] = useState<Hall[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useModalEscape(true, onClose);

  // Halls change every semester, so residence is editable here (this modal
  // doubles as the account settings surface). Loaded lazily on edit.
  useEffect(() => {
    if (isEditing && hallsList.length === 0) {
      repo.getHalls().then(setHallsList).catch(() => setHallsList([]));
    }
  }, [isEditing, hallsList.length]);

  const handleSaveProfile = async () => {
    if (phoneNumber.trim() && !isValidNigerianPhone(phoneNumber)) {
      showToast('Enter a valid 11-digit Nigerian phone number.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        bio: bio.trim(),
        roomNumber: roomNumber.trim(),
        telegramHandle: telegramHandle.trim(),
        phoneNumber: phoneNumber.trim() ? normalizeNigerianPhone(phoneNumber) : undefined,
        hallId,
        gender,
      });
      showToast('Profile updated', 'success');
      setIsEditing(false);
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportUser = async () => {
    if (!currentUser) return;
    try {
      await repo.createReport({
        reporterId: currentUser.id,
        targetType: 'user',
        targetId: user.id,
        targetTitle: `@${user.username} (${user.fullName})`,
        reason: 'Reported by user for community guidelines review',
      });
      showToast('User reported to moderation queue', 'info');
    } catch {
      showToast('Failed to report user', 'error');
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">@{user.username}</span>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-xs">
          {/* Instagram-Style Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <img
              src={user.avatarUrl || '/seed/avatar-default.svg'}
              alt={user.fullName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[var(--color-border)] object-cover bg-neutral-100 shrink-0"
              referrerPolicy="no-referrer"
            />

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-[var(--color-text-main)] flex items-center justify-center sm:justify-start gap-1.5">
                    <span>{user.fullName}</span>
                    {user.badges.includes('Verified Seller') && (
                      <span title="Verified Seller">
                        <ShieldCheck className="w-4 h-4 text-[var(--color-brand-primary)]" />
                      </span>
                    )}
                  </h1>
                  <p className="text-xs font-mono text-[var(--color-text-muted)]">@{user.username}</p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {!isSelf ? (
                    <>
                      <button
                        onClick={() => onOpenChatWith(user.id)}
                        className="px-4 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold flex items-center gap-1.5 hover:opacity-90"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={handleReportUser}
                        className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500"
                        title="Report User"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing((prev) => !prev)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] font-medium flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Badges strip (Clean unboxed badges) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {user.badges.map((b) => (
                  <span
                    key={b}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] border border-[var(--color-border)]"
                  >
                    {b}
                  </span>
                ))}
                {user.adminLevel && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold">
                    Admin ({user.adminLevel.replace(/_/g, ' ')})
                  </span>
                )}
              </div>

              {/* Bio & Details */}
              {!isEditing ? (
                <div className="space-y-1 pt-1 text-[var(--color-text-muted)]">
                  <p className="text-xs text-[var(--color-text-main)] leading-relaxed">{user.bio || 'No bio yet.'}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[var(--color-brand-primary)]" />
                      {formatHallName(user.hallId)}{isSelf && user.roomNumber ? ` · Room ${user.roomNumber}` : ''}
                    </span>
                    {user.telegramHandle ? (
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3 text-sky-500" />
                        {user.telegramHandle}
                      </span>
                    ) : null}
                    {user.phoneNumber ? (
                      <span className="flex items-center gap-1 font-mono">
                        {user.phoneNumber}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {user.ratingAverage.toFixed(1)} ({user.ratingCount} reviews)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[var(--color-text-muted)] mb-1">Bio</label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1">Room Number</label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1">Hall</label>
                      {hallsList.length === 0 ? (
                        <p className="text-[11px] text-[var(--color-text-muted)] py-2">Loading halls...</p>
                      ) : (
                        <select
                          value={hallId}
                          onChange={(e) => setHallId(e.target.value)}
                          className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                        >
                          {hallsList.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as Gender)}
                        className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1">Telegram Handle (Optional)</label>
                      <input
                        type="text"
                        value={telegramHandle}
                        onChange={(e) => setTelegramHandle(e.target.value)}
                        placeholder="@janedoe"
                        className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="08031234567"
                        className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-[var(--color-brand-primary)] text-white font-semibold rounded-lg hover:opacity-90"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller Application CTA if not a seller */}
          {isSelf && !user.isSellerApproved && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs">Become an Oja Campus Seller</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {user.sellerApplicationStatus === 'pending'
                    ? 'Your seller application with bank details is currently under admin consideration.'
                    : 'Submit your Nigerian bank account details to post products and receive payouts.'}
                </p>
              </div>
              {user.sellerApplicationStatus !== 'pending' && (
                <button
                  onClick={onOpenSellerApply}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold shrink-0"
                >
                  Apply Now
                </button>
              )}
            </div>
          )}

          {/* User's Listings Grid */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-[var(--color-text-main)]">
              Listings ({userListings.length})
            </h3>
            {userListings.length === 0 ? (
              <p className="text-center py-8 text-[var(--color-text-muted)]">No active listings published yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    seller={user}
                    onClick={() => onSelectListing(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
