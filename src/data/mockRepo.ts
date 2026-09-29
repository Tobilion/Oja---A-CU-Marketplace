/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Repository,
  PlaceOrderInput,
  AdminUserUpdates,
  AvailableDelivery,
} from './repo';
import {
  UserProfile,
  Listing,
  Business,
  Order,
  SubOrder,
  OrderState,
  Review,
  Report,
  ChatThread,
  ChatMessage,
  AppNotification,
  AuditLogEntry,
  AppSettings,
  Hall,
  Category,
  BankDetails,
} from '../types';
import { MockStorage, pickCurrentUser } from './mockStorage';
import { calculateOrderDeliveryFee, calculateLatePenalty } from '../utils/deliveryFee';
import { VALID_ORDER_TRANSITIONS, validateOrderTransition, deriveOrderActorRole } from '../utils/transitions';
import { FOUNDING_SUPER_ADMIN_EMAILS } from '../config/appConfig';
import { isOnlyDeliveryAgentDiff } from '../utils/adminGuards';

export class MockRepository implements Repository {
  readonly isMock = true;

  // --- Auth & Profiles ---
  async getCurrentUser(): Promise<UserProfile | null> {
    // BUG-1: never fall back to users[0]; a stored logout stays logged out.
    const id = MockStorage.getCurrentUserId();
    return pickCurrentUser(id, MockStorage.getUsers());
  }

  async switchUser(userId: string): Promise<UserProfile | null> {
    const users = MockStorage.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target) {
      MockStorage.setCurrentUserId(target.id);
      return target;
    }
    return null;
  }

  async getUsers(): Promise<UserProfile[]> {
    return MockStorage.getUsers();
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const users = MockStorage.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const users = MockStorage.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');

    // B-04: Strip privileged columns to prevent self-escalation.
    // Bank details are the seller's own payout data, so self-update is allowed.
    const safeUpdates: Partial<UserProfile> = {
      fullName: updates.fullName,
      username: updates.username,
      hallId: updates.hallId,
      roomNumber: updates.roomNumber,
      gender: updates.gender,
      telegramHandle: updates.telegramHandle,
      matricNumber: updates.matricNumber,
      regNumber: updates.regNumber,
      bio: updates.bio,
      avatarUrl: updates.avatarUrl,
      personalEmail: updates.personalEmail,
      bankDetails: updates.bankDetails,
    };
    // Strip undefined properties
    Object.keys(safeUpdates).forEach((k) => {
      if ((safeUpdates as any)[k] === undefined) delete (safeUpdates as any)[k];
    });

    const updated = { ...users[idx], ...safeUpdates };
    users[idx] = updated;
    MockStorage.setUsers(users);
    return updated;
  }

  async adminUpdateUser(actorId: string, targetId: string, updates: AdminUserUpdates): Promise<UserProfile> {
    // H-03: privileged administration with self-action guards, last-Super
    // admin protection, founding-admin protection, badge dependency, and a
    // before/after audit entry. Mirrored server-side by trigger + RLS.
    const users = MockStorage.getUsers();
    const actor = users.find((u) => u.id === actorId);
    if (!actor?.adminLevel) throw new Error('Admin privileges required.');
    const idx = users.findIndex((u) => u.id === targetId);
    if (idx === -1) throw new Error('User not found');
    if (actorId === targetId) {
      throw new Error('You cannot change your own role, badges, or suspension status.');
    }
    const target = users[idx];

    const wantsRoleChange = updates.adminLevel !== undefined || updates.badges !== undefined;
    const wantsModeration =
      updates.isSuspended !== undefined ||
      updates.isSellerApproved !== undefined ||
      updates.sellerApplicationStatus !== undefined;
    const isSuper = actor.adminLevel === 'super_admin';
    const isMod = actor.adminLevel === 'moderator';
    const isLogistics = actor.adminLevel === 'logistics_admin';
    if (wantsRoleChange && !isSuper) {
      // Scoped carve-out: logistics may touch ONLY the Delivery Agent badge.
      const nextBadges = updates.badges !== undefined ? [...updates.badges] : [...target.badges];
      const onlyAgentBadge =
        updates.adminLevel === undefined && isLogistics && isOnlyDeliveryAgentDiff(target.badges, nextBadges);
      if (!onlyAgentBadge) {
        throw new Error('Only a Super admin can change badges or admin levels.');
      }
    }
    if (wantsModeration && !(isSuper || isMod)) {
      throw new Error('Only a Super admin or Moderator can suspend users or approve sellers.');
    }

    const targetEmails = [target.personalEmail, target.schoolEmail].map((e) => (e || '').toLowerCase());
    const isFounding = FOUNDING_SUPER_ADMIN_EMAILS.some((f) => targetEmails.includes(f.toLowerCase()));
    const demoting = target.adminLevel === 'super_admin' && updates.adminLevel !== undefined && updates.adminLevel !== 'super_admin';
    const suspending = updates.isSuspended === true;
    if (isFounding && (demoting || suspending)) {
      throw new Error('Founding admins are protected from demotion and suspension.');
    }
    if (demoting && users.every((u) => u.id === target.id || u.adminLevel !== 'super_admin')) {
      throw new Error('You cannot demote the last Super admin.');
    }

    const before = {
      badges: [...target.badges],
      adminLevel: target.adminLevel ?? null,
      isSuspended: target.isSuspended,
      isSellerApproved: target.isSellerApproved,
      sellerApplicationStatus: target.sellerApplicationStatus ?? 'none',
    };

    // L-02 badge dependency: Verified Seller implies Seller.
    let badges = updates.badges !== undefined ? [...updates.badges] : [...target.badges];
    if (badges.includes('Verified Seller') && !badges.includes('Seller')) {
      badges.push('Seller');
    }

    const updated: UserProfile = {
      ...target,
      badges,
      adminLevel: updates.adminLevel !== undefined ? updates.adminLevel : target.adminLevel,
      isSuspended: updates.isSuspended !== undefined ? updates.isSuspended : target.isSuspended,
      isSellerApproved:
        updates.isSellerApproved !== undefined ? updates.isSellerApproved : target.isSellerApproved,
      sellerApplicationStatus:
        updates.sellerApplicationStatus !== undefined
          ? updates.sellerApplicationStatus
          : target.sellerApplicationStatus,
    };
    if (badges.includes('Seller') || badges.includes('Verified Seller')) {
      updated.isSellerApproved = true;
      if (updated.sellerApplicationStatus === 'pending') updated.sellerApplicationStatus = 'approved';
    }
    users[idx] = updated;
    MockStorage.setUsers(users);

    const after = {
      badges: [...updated.badges],
      adminLevel: updated.adminLevel ?? null,
      isSuspended: updated.isSuspended,
      isSellerApproved: updated.isSellerApproved,
      sellerApplicationStatus: updated.sellerApplicationStatus ?? 'none',
    };
    await this.logAdminAction({
      adminId: actor.id,
      adminEmail: actor.personalEmail || actor.schoolEmail,
      action: 'ADMIN_USER_UPDATE',
      targetType: 'USER',
      targetId: target.id,
      details: JSON.stringify({ before, after }),
    });
    return updated;
  }

  async applyForSeller(userId: string, bankDetails: BankDetails): Promise<void> {
    const users = MockStorage.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx].bankDetails = bankDetails;
    users[idx].sellerApplicationStatus = 'pending';
    users[idx].sellerApplicationDate = new Date().toISOString();
    MockStorage.setUsers(users);

    // Notify user
    this.addNotification({
      userId,
      title: 'Seller Application Received',
      message: 'Your seller request with bank details has been submitted. Admins will review your profile.',
      type: 'seller',
    });
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    // In mock mode, any 6-digit code or "123456" succeeds
    if (code.length === 6) {
      const users = MockStorage.getUsers();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.isPersonalEmailVerified = true;
        // Check founding admin bootstrap
        if (['tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng'].includes(user.personalEmail.toLowerCase())) {
          user.adminLevel = 'super_admin';
          if (!user.badges.includes('Admin')) user.badges.push('Admin');
        }
        MockStorage.setUsers(users);
      }
      return true;
    }
    return false;
  }

  async signInWithGoogleSchool(schoolEmail: string, fullName: string): Promise<UserProfile> {
    const normalized = schoolEmail.trim().toLowerCase();
    if (!normalized.endsWith('@stu.cu.edu.ng')) {
      throw new Error('Only official Covenant University student emails (@stu.cu.edu.ng) are accepted.');
    }
    const users = MockStorage.getUsers();
    let existing = users.find((u) => u.schoolEmail.toLowerCase() === normalized);
    if (!existing) {
      const username = normalized.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const newUser: UserProfile = {
        id: 'user_' + Date.now(),
        fullName,
        username,
        personalEmail: '',
        schoolEmail: normalized,
        isSchoolEmailVerified: true,
        isPersonalEmailVerified: false,
        hallId: 'hall_peter',
        roomNumber: 'A-101',
        gender: 'male',
        telegramHandle: '@' + username,
        badges: ['Member'],
        adminLevel: null,
        isSellerApproved: false,
        isSuspended: false,
        ratingAverage: 5.0,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
      };
      if (['tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng'].includes(normalized)) {
        newUser.adminLevel = 'super_admin';
        newUser.badges.push('Admin');
      }
      users.push(newUser);
      MockStorage.setUsers(users);
      existing = newUser;
    }
    MockStorage.setCurrentUserId(existing.id);
    return existing;
  }

  async signInWithEmailPassword(email: string): Promise<UserProfile> {
    const normalized = email.trim().toLowerCase();
    const users = MockStorage.getUsers();
    let existing = users.find((u) => u.personalEmail.toLowerCase() === normalized || u.schoolEmail.toLowerCase() === normalized);
    if (!existing) {
      throw new Error('Account not found with this email. Please sign up first.');
    }
    MockStorage.setCurrentUserId(existing.id);
    return existing;
  }

  async signUp(data: Partial<UserProfile>): Promise<UserProfile> {
    const users = MockStorage.getUsers();
    const schoolEmail = (data.schoolEmail || '').trim().toLowerCase();
    if (!schoolEmail.endsWith('@stu.cu.edu.ng')) {
      throw new Error('School email must end in @stu.cu.edu.ng');
    }
    const username = (data.username || schoolEmail.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '_');
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username @' + username + ' is already taken. Please choose another.');
    }

    const newUser: UserProfile = {
      id: 'user_' + Date.now(),
      fullName: data.fullName || 'Student',
      username,
      personalEmail: (data.personalEmail || '').trim().toLowerCase(),
      schoolEmail,
      isSchoolEmailVerified: false,
      isPersonalEmailVerified: false,
      hallId: data.hallId || 'hall_peter',
      roomNumber: data.roomNumber || 'A-101',
      gender: data.gender || 'male',
      telegramHandle: data.telegramHandle?.startsWith('@') ? data.telegramHandle : '@' + (data.telegramHandle || username),
      matricNumber: data.matricNumber,
      regNumber: data.regNumber,
      bio: data.bio || '',
      badges: ['Member'],
      adminLevel: null,
      bankDetails: data.bankDetails,
      isSellerApproved: false,
      sellerApplicationStatus: data.sellerApplicationStatus || 'none',
      sellerApplicationDate: data.sellerApplicationStatus === 'pending' ? new Date().toISOString() : undefined,
      isSuspended: false,
      ratingAverage: 5.0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Auto bootstrap founding super admin
    if (['tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng'].includes(newUser.personalEmail) || ['tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng'].includes(newUser.schoolEmail)) {
      newUser.adminLevel = 'super_admin';
      newUser.badges.push('Admin');
    }

    users.push(newUser);
    MockStorage.setUsers(users);
    MockStorage.setCurrentUserId(newUser.id);
    return newUser;
  }

  async signOut(): Promise<void> {
    // BUG-1: persist an explicit logged-out state (survives refresh) and
    // never restore a persona until one is picked. Double-click safe.
    MockStorage.setCurrentUserId(null);
  }

  // --- Listings ---
  async getListings(includeRecycled = false): Promise<Listing[]> {
    const listings = MockStorage.getListings();
    if (includeRecycled) return listings;
    return listings.filter((l) => l.status === 'active' || l.status === 'sold_out');
  }

  async getListingById(id: string): Promise<Listing | null> {
    const listings = MockStorage.getListings();
    return listings.find((l) => l.id === id) || null;
  }

  async createListing(data: Omit<Listing, 'id' | 'createdAt' | 'viewsCount' | 'isReported'>): Promise<Listing> {
    const listings = MockStorage.getListings();
    const newListing: Listing = {
      ...data,
      id: 'list_' + Date.now(),
      createdAt: new Date().toISOString(),
      viewsCount: 0,
      isReported: false,
    };
    listings.unshift(newListing);
    MockStorage.setListings(listings);
    return newListing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const listings = MockStorage.getListings();
    const idx = listings.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Listing not found');
    const updated = { ...listings[idx], ...updates };
    listings[idx] = updated;
    MockStorage.setListings(listings);
    return updated;
  }

  async moveToRecycleBin(id: string): Promise<void> {
    const listings = MockStorage.getListings();
    const item = listings.find((l) => l.id === id);
    if (item) {
      item.status = 'in_recycle_bin';
      item.recycledAt = new Date().toISOString();
      MockStorage.setListings(listings);
    }
  }

  async restoreFromRecycleBin(id: string): Promise<void> {
    const listings = MockStorage.getListings();
    const item = listings.find((l) => l.id === id);
    if (item) {
      item.status = item.stock > 0 ? 'active' : 'sold_out';
      item.recycledAt = undefined;
      MockStorage.setListings(listings);
    }
  }

  async permanentlyDeleteListing(id: string): Promise<void> {
    const listings = MockStorage.getListings();
    const filtered = listings.filter((l) => l.id !== id);
    MockStorage.setListings(filtered);
  }

  async incrementListingViews(id: string): Promise<void> {
    const listings = MockStorage.getListings();
    const item = listings.find((l) => l.id === id);
    if (item) {
      item.viewsCount = (item.viewsCount || 0) + 1;
      MockStorage.setListings(listings);
    }
  }

  // --- Businesses ---
  async getBusinesses(): Promise<Business[]> {
    return MockStorage.getBusinesses();
  }

  async getBusinessById(id: string): Promise<Business | null> {
    const businesses = MockStorage.getBusinesses();
    return businesses.find((b) => b.id === id) || null;
  }

  async createBusiness(biz: Omit<Business, 'id' | 'createdAt' | 'followerIds' | 'status' | 'blockedMemberIds'>): Promise<Business> {
    const businesses = MockStorage.getBusinesses();
    const newBiz: Business = {
      ...biz,
      id: 'biz_' + Date.now(),
      status: 'pending',
      followerIds: [],
      blockedMemberIds: [],
      createdAt: new Date().toISOString(),
    };
    businesses.push(newBiz);
    MockStorage.setBusinesses(businesses);
    return newBiz;
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const businesses = MockStorage.getBusinesses();
    const idx = businesses.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Business not found');
    const updated = { ...businesses[idx], ...updates };
    businesses[idx] = updated;
    MockStorage.setBusinesses(businesses);
    return updated;
  }

  async toggleFollowBusiness(businessId: string, userId: string): Promise<boolean> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) return false;
    const exists = biz.followerIds.includes(userId);
    if (exists) {
      biz.followerIds = biz.followerIds.filter((id) => id !== userId);
    } else {
      biz.followerIds.push(userId);
    }
    MockStorage.setBusinesses(businesses);
    return !exists;
  }

  async transferBusinessOwnership(businessId: string, newOwnerId: string): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (biz) {
      biz.ownerId = newOwnerId;
      if (!biz.memberIds.includes(newOwnerId)) {
        biz.memberIds.push(newOwnerId);
      }
      MockStorage.setBusinesses(businesses);
    }
  }

  async requestBusinessOwnershipTransfer(businessId: string, newOwnerId: string): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Business not found');
    biz.transferRequest = {
      newOwnerId,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    MockStorage.setBusinesses(businesses);
    this.addNotification({
      userId: newOwnerId,
      title: 'Business Ownership Transfer Request',
      message: `You have been nominated to take over ownership of ${biz.name}. Awaiting admin approval.`,
      type: 'business',
      linkId: biz.id,
    });
  }

  async approveBusinessOwnershipTransfer(businessId: string, approved: boolean): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz || !biz.transferRequest) throw new Error('No pending transfer request found');

    if (approved) {
      const oldOwnerId = biz.ownerId;
      biz.ownerId = biz.transferRequest.newOwnerId;
      if (!biz.memberIds.includes(biz.ownerId)) {
        biz.memberIds.push(biz.ownerId);
      }
      biz.transferRequest.status = 'approved';
      MockStorage.setBusinesses(businesses);

      this.addNotification({
        userId: biz.ownerId,
        title: 'Ownership Transfer Approved',
        message: `You are now the official owner of ${biz.name}.`,
        type: 'business',
        linkId: biz.id,
      });
      this.addNotification({
        userId: oldOwnerId,
        title: 'Business Handover Completed',
        message: `Ownership of ${biz.name} has been transferred.`,
        type: 'business',
        linkId: biz.id,
      });
    } else {
      biz.transferRequest.status = 'rejected';
      MockStorage.setBusinesses(businesses);
      this.addNotification({
        userId: biz.ownerId,
        title: 'Transfer Request Rejected',
        message: `Admin rejected ownership transfer of ${biz.name}.`,
        type: 'business',
      });
    }
  }

  async requestJoinBusiness(businessId: string, userId: string): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Business not found');
    if (!biz.joinRequests) biz.joinRequests = [];
    if (!biz.joinRequests.includes(userId)) {
      biz.joinRequests.push(userId);
      MockStorage.setBusinesses(businesses);
      this.addNotification({
        userId: biz.ownerId,
        title: 'New Member Join Request',
        message: `A student requested to join ${biz.name}.`,
        type: 'business',
        linkId: biz.id,
      });
    }
  }

  async approveJoinBusiness(businessId: string, userId: string, approved: boolean): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Business not found');
    if (biz.joinRequests) {
      biz.joinRequests = biz.joinRequests.filter((id) => id !== userId);
    }
    if (approved) {
      if (!biz.memberIds.includes(userId)) {
        biz.memberIds.push(userId);
      }
      this.addNotification({
        userId,
        title: 'Joined Business Team',
        message: `You are now a registered team member of ${biz.name}.`,
        type: 'business',
        linkId: biz.id,
      });
    }
    MockStorage.setBusinesses(businesses);
  }

  async blockBusinessMember(businessId: string, memberId: string, blocked: boolean): Promise<void> {
    const businesses = MockStorage.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) throw new Error('Business not found');
    if (!biz.blockedMemberIds) biz.blockedMemberIds = [];

    if (blocked) {
      if (!biz.blockedMemberIds.includes(memberId)) {
        biz.blockedMemberIds.push(memberId);
      }
      biz.memberIds = biz.memberIds.filter((id) => id !== memberId);
    } else {
      biz.blockedMemberIds = biz.blockedMemberIds.filter((id) => id !== memberId);
    }
    MockStorage.setBusinesses(businesses);
  }

  // --- Orders & Checkout ---
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Your cart is empty. Please add at least one item before checkout.');
    }

    const listings = MockStorage.getListings();
    const users = MockStorage.getUsers();

    // 1. ATOMIC BOUNDARY & STOCK VALIDATION
    for (const item of input.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Item quantity must be a positive integer greater than zero.');
      }
      const listing = listings.find((l) => l.id === item.listingId);
      if (!listing) {
        throw new Error(`Listing not found: ${item.listingId}`);
      }
      if (listing.status !== 'active') {
        throw new Error(`"${listing.title}" is no longer available for purchase.`);
      }
      if (listing.sellerId === input.buyerId) {
        throw new Error(`You cannot purchase your own listing ("${listing.title}").`);
      }
      if (listing.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${listing.title}". Available: ${listing.stock}, requested: ${item.quantity}`);
      }
    }

    // 2. CHECK VERIFIED SELLER REQUIREMENT FOR DIRECT PAYMENTS
    if (input.paymentMode === 'pay_seller_direct') {
      for (const item of input.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;
        const seller = users.find((u) => u.id === listing.sellerId);
        if (!seller || !seller.badges.includes('Verified Seller')) {
          throw new Error(
            `Seller "${seller?.fullName || 'unknown'}" is not a Verified Seller. Direct seller payments are strictly restricted to Verified Sellers.`
          );
        }
      }
    }

    // Decrement stock atomically
    for (const item of input.items) {
      const listing = listings.find((l) => l.id === item.listingId)!;
      listing.stock -= item.quantity;
      if (listing.stock === 0) {
        listing.status = 'sold_out';
      }
    }
    MockStorage.setListings(listings);

    // 2. GROUP ITEMS BY SELLER FOR SUB-ORDERS
    const sellerGroups: Record<string, { listing: Listing; quantity: number }[]> = {};
    for (const item of input.items) {
      const listing = listings.find((l) => l.id === item.listingId)!;
      if (!sellerGroups[listing.sellerId]) {
        sellerGroups[listing.sellerId] = [];
      }
      sellerGroups[listing.sellerId].push({ listing, quantity: item.quantity });
    }

    // 3. CALCULATE DELIVERY FEES WITH PURE ENGINE
    const sellerInputs = Object.entries(sellerGroups).map(([sellerId, items]) => {
      const seller = users.find((u) => u.id === sellerId);
      const subtotal = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);
      const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
      return {
        sellerId,
        sellerHallId: seller?.hallId || 'hall_peter',
        sellerName: seller?.fullName,
        subtotal,
        itemCount,
      };
    });

    const feeResult = calculateOrderDeliveryFee(sellerInputs, input.deliveryMode);

    // 4. ASSEMBLE SUB-ORDERS
    const orderId = 'ord_' + Date.now();
    const subOrders: SubOrder[] = Object.entries(sellerGroups).map(([sellerId, groupItems], idx) => {
      const feeBreakdown = feeResult.sellerBreakdowns.find((b) => b.sellerId === sellerId);
      const subtotal = groupItems.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);
      const deliveryFee = feeBreakdown?.finalFee || 0;
      const firstItem = groupItems[0].listing;

      return {
        id: `sub_${orderId}_${idx + 1}`,
        orderId,
        sellerId,
        businessId: firstItem.businessId,
        status: input.paymentMode === 'pay_on_delivery' ? 'payment_confirmed' : 'awaiting_payment',
        subtotal,
        deliveryFee,
        itemsCount: groupItems.reduce((sum, i) => sum + i.quantity, 0),
        penaltyAmount: 0,
        sellerPayoutAmount: subtotal,
        sellerPaidOut: false,
        items: groupItems.map((gi) => ({
          id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
          listingId: gi.listing.id,
          title: gi.listing.title,
          price: gi.listing.price,
          quantity: gi.quantity,
          image: gi.listing.images[0] || '',
          categoryId: gi.listing.categoryId,
        })),
        statusTimeline: [
          {
            state: input.paymentMode === 'pay_on_delivery' ? 'payment_confirmed' : 'awaiting_payment',
            timestamp: new Date().toISOString(),
            note: 'Order placed by buyer',
          },
        ],
      };
    });

    const itemsSubtotal = subOrders.reduce((sum, s) => sum + s.subtotal, 0);
    const deliveryFeeTotal = feeResult.finalTotalDeliveryFee;
    const totalAmount = itemsSubtotal + deliveryFeeTotal;
    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    const newOrder: Order = {
      id: orderId,
      orderNumber: 'OJA-' + Math.floor(1000 + Math.random() * 9000),
      buyerId: input.buyerId,
      deliveryMode: input.deliveryMode,
      deliveryHallId: input.deliveryHallId,
      deliveryRoom: input.deliveryRoom,
      deliveryNotes: input.deliveryNotes,
      paymentMode: input.paymentMode,
      paymentStatus: input.paymentMode === 'pay_on_delivery' ? 'not_applicable' : 'pending_verification',
      deliveryFeeTotal,
      itemsSubtotal,
      totalAmount,
      status: input.paymentMode === 'pay_on_delivery' ? 'payment_confirmed' : 'awaiting_payment',
      deliveryCode,
      subOrders,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orders = MockStorage.getOrders();
    orders.unshift(newOrder);
    MockStorage.setOrders(orders);

    // Notify sellers
    for (const sub of subOrders) {
      this.addNotification({
        userId: sub.sellerId,
        title: 'New Order Received',
        message: `Order ${newOrder.orderNumber} for ₦${sub.subtotal.toLocaleString()} requires your acceptance.`,
        type: 'order',
        linkId: newOrder.id,
      });
    }

    // Dev Outbox: Record order placement email
    const emails = MockStorage.getEmailOutbox();
    const buyer = users.find((u) => u.id === input.buyerId);
    emails.unshift({
      id: 'eml_' + Date.now(),
      to: buyer?.schoolEmail || buyer?.personalEmail || 'student@stu.cu.edu.ng',
      subject: `Order Confirmation: ${newOrder.orderNumber}`,
      htmlContent: `<p>Your order <strong>${newOrder.orderNumber}</strong> has been received by Oja. Total: ₦${newOrder.totalAmount.toLocaleString()}.</p>`,
      type: 'order_placed',
      sentAt: new Date().toISOString(),
      metadata: { orderId: newOrder.id },
    });
    MockStorage.setEmailOutbox(emails);

    return newOrder;
  }

  async advanceOrderStatus(orderId: string, subOrderId: string, nextState: OrderState, note?: string, actorId?: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    // H-04: enforce the shared transition map. Legality always applies; actor
    // and role validation applies when the caller identifies the actor.
    const legalNext = VALID_ORDER_TRANSITIONS[sub.status] || [];
    if (!legalNext.includes(nextState)) {
      throw new Error(`Illegal state transition from "${sub.status}" to "${nextState}".`);
    }
    if (actorId) {
      const users = MockStorage.getUsers();
      const actor = users.find((u) => u.id === actorId);
      const role = deriveOrderActorRole({
        buyerId: order.buyerId,
        sellerId: sub.sellerId,
        agentId: sub.agentId,
        actorId,
        adminLevel: actor?.adminLevel ?? null,
      });
      if (!role) throw new Error('You are not a party to this order.');
      const check = validateOrderTransition(sub.status, nextState, role, actor?.adminLevel ?? null);
      if (!check.allowed) throw new Error(check.reason || 'Transition not permitted for your role.');
    }

    sub.status = nextState;
    sub.statusTimeline.push({
      state: nextState,
      timestamp: new Date().toISOString(),
      note,
    });

    // Check overall order status rollup
    const allStates = order.subOrders.map((s) => s.status);
    if (allStates.every((st) => st === 'completed')) order.status = 'completed';
    else if (allStates.every((st) => st === 'delivered')) order.status = 'delivered';
    else if (allStates.some((st) => st === 'out_for_delivery')) order.status = 'out_for_delivery';
    else if (allStates.every((st) => st === 'seller_accepted' || st === 'ready')) order.status = 'seller_accepted';

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);
    return order;
  }

  async rejectSubOrder(orderId: string, subOrderId: string, reason: string, actorId?: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    // Ownership + legality: only the seller (or Super admin) may reject, and
    // only before the sub-order leaves the cancellable states.
    if (actorId) {
      const users = MockStorage.getUsers();
      const actor = users.find((u) => u.id === actorId);
      if (actor?.id !== sub.sellerId && actor?.adminLevel !== 'super_admin') {
        throw new Error('Only the assigned seller can reject this sub-order.');
      }
    }
    if (sub.status !== 'payment_confirmed' && sub.status !== 'seller_accepted') {
      throw new Error(`Illegal state transition from "${sub.status}" to "cancelled".`);
    }

    // Atomic Stock Rollback for this sub-order's items
    const listings = MockStorage.getListings();
    for (const item of sub.items) {
      const listing = listings.find((l) => l.id === item.listingId);
      if (listing) {
        listing.stock += item.quantity;
        if (listing.status === 'sold_out') {
          listing.status = 'active';
        }
      }
    }
    MockStorage.setListings(listings);

    sub.status = 'cancelled';
    sub.statusTimeline.push({
      state: 'cancelled',
      timestamp: new Date().toISOString(),
      note: `Seller rejected sub-order: ${reason}. Stock returned to inventory.`,
    });

    // If all sub-orders are cancelled, order is cancelled
    if (order.subOrders.every((s) => s.status === 'cancelled')) {
      order.status = 'cancelled';
    }

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: order.buyerId,
      title: 'Item Order Rejected by Seller',
      message: `A seller could not fulfill part of order ${order.orderNumber}. Reason: ${reason}. Funds will be adjusted/refunded.`,
      type: 'order',
      linkId: order.id,
    });

    return order;
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    // Rollback stock for all items
    const listings = MockStorage.getListings();
    // Parity with the Supabase path: only sub-orders in a cancellable state
    // move; terminal ones are left alone instead of corrupting history.
    const cancellable: OrderState[] = ['awaiting_payment', 'payment_confirmed', 'seller_accepted', 'ready', 'agent_assigned', 'disputed'];
    for (const sub of order.subOrders) {
      if (!cancellable.includes(sub.status)) continue;
      for (const item of sub.items) {
        const listing = listings.find((l) => l.id === item.listingId);
        if (listing) {
          listing.stock += item.quantity;
          if (listing.status === 'sold_out') {
            listing.status = 'active';
          }
        }
      }
      sub.status = 'cancelled';
      sub.statusTimeline.push({
        state: 'cancelled',
        timestamp: new Date().toISOString(),
        note: `Order cancelled: ${reason}. Stock returned.`,
      });
    }
    MockStorage.setListings(listings);

    if (order.subOrders.every((s) => s.status === 'cancelled')) {
      order.status = 'cancelled';
    }
    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: order.buyerId,
      title: 'Order Cancelled',
      message: `Order ${order.orderNumber} has been cancelled. Reason: ${reason}.`,
      type: 'order',
      linkId: order.id,
    });

    return order;
  }

  async disputeOrder(orderId: string, reason: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    order.status = 'disputed';
    for (const sub of order.subOrders) {
      sub.status = 'disputed';
      sub.statusTimeline.push({
        state: 'disputed',
        timestamp: new Date().toISOString(),
        note: `Dispute opened by buyer: ${reason}`,
      });
    }
    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    // Create moderation report for the dispute
    await this.createReport({
      reporterId: order.buyerId,
      targetType: 'order',
      targetId: order.id,
      targetTitle: `Disputed Order ${order.orderNumber}`,
      reason: `Customer opened a dispute: ${reason}`,
    });

    this.addNotification({
      userId: order.buyerId,
      title: 'Dispute Case Opened',
      message: `Your dispute for order ${order.orderNumber} has been escalated to Oja administrators. Funds remain safely held in escrow.`,
      type: 'order',
      linkId: order.id,
    });

    return order;
  }

  async extendDeliveryPromise(orderId: string, subOrderId: string, additionalHours: number, reason: string, actorId?: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    // Only Logistics admins and Super admins may extend the promise.
    if (actorId) {
      const users = MockStorage.getUsers();
      const actor = users.find((u) => u.id === actorId);
      if (actor?.adminLevel !== 'super_admin' && actor?.adminLevel !== 'logistics_admin') {
        throw new Error('Only Logistics admins or Super admins can extend the delivery promise.');
      }
    }
    if (!additionalHours || additionalHours <= 0) {
      throw new Error('Extension must be a positive number of hours.');
    }

    sub.deliveryTimeAgreedHours = (sub.deliveryTimeAgreedHours || 48) + additionalHours;
    sub.statusTimeline.push({
      state: sub.status,
      timestamp: new Date().toISOString(),
      note: `Delivery window extended by ${additionalHours} hours by administrator. Reason: ${reason}.`,
    });

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: order.buyerId,
      title: 'Delivery Schedule Update',
      message: `The delivery promise for ${order.orderNumber} was extended by ${additionalHours}h. Note: ${reason}.`,
      type: 'delivery',
      linkId: order.id,
    });

    return order;
  }

  async submitPaymentDetails(orderId: string, reference: string, senderName: string, amount: number): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.paymentReference = reference;
    order.senderAccountName = senderName;
    order.paymentAmountPaid = amount;
    order.paymentStatus = 'pending_verification';
    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);
    return order;
  }

  async verifyPayment(orderId: string, approved: boolean, note?: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    // Double-action guard
    if (order.paymentStatus === 'verified') {
      throw new Error('Payment for this order has already been verified.');
    }

    if (approved) {
      order.paymentStatus = 'verified';
      order.status = 'payment_confirmed';
      for (const sub of order.subOrders) {
        sub.status = 'payment_confirmed';
        sub.statusTimeline.push({
          state: 'payment_confirmed',
          timestamp: new Date().toISOString(),
          note: note || 'Payment verified by admin',
        });
      }
      this.addNotification({
        userId: order.buyerId,
        title: 'Payment Confirmed',
        message: `Your payment of ₦${order.totalAmount.toLocaleString()} for order ${order.orderNumber} is confirmed. Sellers have been notified.`,
        type: 'order',
        linkId: order.id,
      });
    } else {
      order.paymentStatus = 'rejected';
      this.addNotification({
        userId: order.buyerId,
        title: 'Payment Verification Failed',
        message: `Your transfer reference for ${order.orderNumber} could not be verified. Note: ${note || 'Please recheck details'}.`,
        type: 'order',
        linkId: order.id,
      });
    }

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);
    return order;
  }

  async sellerAcceptSubOrder(orderId: string, subOrderId: string, agreedHours: number, actorId?: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    if (actorId) {
      const users = MockStorage.getUsers();
      const actor = users.find((u) => u.id === actorId);
      if (actor?.id !== sub.sellerId && actor?.adminLevel !== 'super_admin') {
        throw new Error('Only the assigned seller can accept this sub-order.');
      }
    }
    if (sub.status !== 'payment_confirmed') {
      throw new Error(`Illegal state transition from "${sub.status}" to "seller_accepted".`);
    }
    if (!agreedHours || agreedHours <= 0) {
      throw new Error('Agreed delivery window must be a positive number of hours.');
    }

    sub.sellerAcceptedAt = new Date().toISOString();
    sub.deliveryTimeAgreedHours = agreedHours;
    sub.status = 'seller_accepted';
    sub.statusTimeline.push({
      state: 'seller_accepted',
      timestamp: new Date().toISOString(),
      note: `Seller accepted. Delivery window agreed: ${agreedHours} hours.`,
    });

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);
    return order;
  }

  async assignDeliveryAgent(orderId: string, subOrderId: string, agentId: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    if (sub.agentId === agentId) return order; // Idempotent
    if (sub.agentId && sub.status === 'agent_assigned') {
      throw new Error('This sub-order has already been assigned to another delivery agent.');
    }
    if (sub.status !== 'ready') {
      throw new Error(`Only ready sub-orders can be claimed (current: "${sub.status}").`);
    }

    // Hall-gender eligibility, mirroring agent_claim_sub_order.
    const users = MockStorage.getUsers();
    const agent = users.find((u) => u.id === agentId);
    if (!agent || !agent.badges.includes('Delivery Agent')) {
      throw new Error('Only registered delivery agents can claim deliveries.');
    }
    const seller = users.find((u) => u.id === sub.sellerId);
    const halls = MockStorage.getHalls();
    const hallGender = halls.find((h) => h.id === seller?.hallId)?.gender;
    if (hallGender && hallGender !== 'mixed' && hallGender !== agent.gender) {
      throw new Error(`This pickup hall is restricted to ${hallGender} agents.`);
    }

    sub.agentId = agentId;
    sub.status = 'agent_assigned';
    sub.statusTimeline.push({
      state: 'agent_assigned',
      timestamp: new Date().toISOString(),
      note: 'Delivery agent assigned to hall run',
    });

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: agentId,
      title: 'New Delivery Assigned',
      message: `You have been assigned to order ${order.orderNumber}. Destination: ${order.deliveryRoom}.`,
      type: 'delivery',
      linkId: order.id,
    });

    return order;
  }

  async completeDeliveryWithCode(orderId: string, subOrderId: string, code: string, actorId?: string): Promise<boolean> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;
    if (order.deliveryCode.trim() !== code.trim()) {
      return false; // Code mismatch
    }

    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) return false;
    if (sub.status !== 'out_for_delivery') return false;

    // Code possession authorizes handover; when the actor is known it must be
    // the assigned agent (or an admin stepping in).
    if (actorId) {
      const users = MockStorage.getUsers();
      const actor = users.find((u) => u.id === actorId);
      const isAdmin = actor?.adminLevel === 'super_admin' || actor?.adminLevel === 'logistics_admin';
      if (actor?.id !== sub.agentId && !isAdmin) return false;
    }

    sub.deliveredAt = new Date().toISOString();
    sub.status = 'delivered';
    sub.statusTimeline.push({
      state: 'delivered',
      timestamp: new Date().toISOString(),
      note: `Delivery code ${code} validated upon handover`,
    });

    const allDelivered = order.subOrders.every((s) => s.status === 'delivered' || s.status === 'completed');
    if (allDelivered) order.status = 'delivered';

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: order.buyerId,
      title: 'Parcel Delivered',
      message: `Your package for order ${order.orderNumber} has been delivered. Please confirm receipt.`,
      type: 'order',
      linkId: order.id,
    });

    return true;
  }

  async confirmBuyerReceipt(orderId: string, subOrderId: string): Promise<Order> {
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const sub = order.subOrders.find((s) => s.id === subOrderId);
    if (!sub) throw new Error('Sub-order not found');

    sub.completedAt = new Date().toISOString();
    sub.status = 'completed';
    sub.statusTimeline.push({
      state: 'completed',
      timestamp: new Date().toISOString(),
      note: 'Buyer confirmed receipt. Seller payout unlocked.',
    });

    // Check if seller was late and compute penalty
    if (sub.sellerAcceptedAt && sub.deliveryTimeAgreedHours) {
      const accepted = new Date(sub.sellerAcceptedAt).getTime();
      const completed = new Date(sub.completedAt).getTime();
      const hoursTaken = (completed - accepted) / (1000 * 60 * 60);
      const hoursLate = hoursTaken - sub.deliveryTimeAgreedHours;
      if (hoursLate > 0) {
        const penalty = calculateLatePenalty(sub.subtotal, hoursLate);
        sub.penaltyAmount = penalty.penaltyAmount;
        sub.sellerPayoutAmount = Math.max(0, sub.subtotal - penalty.penaltyAmount);
      }
    }

    const allCompleted = order.subOrders.every((s) => s.status === 'completed');
    if (allCompleted) order.status = 'completed';

    order.updatedAt = new Date().toISOString();
    MockStorage.setOrders(orders);

    this.addNotification({
      userId: sub.sellerId,
      title: 'Order Completed & Payout Queued',
      message: `Order ${order.orderNumber} completed. ₦${sub.sellerPayoutAmount.toLocaleString()} is queued for payout.`,
      type: 'seller',
      linkId: order.id,
    });

    // Record Delivery Email in Dev Outbox
    const users = MockStorage.getUsers();
    const buyer = users.find((u) => u.id === order.buyerId);
    const emails = MockStorage.getEmailOutbox();
    emails.unshift({
      id: 'eml_' + Date.now(),
      to: buyer?.schoolEmail || buyer?.personalEmail || 'student@stu.cu.edu.ng',
      subject: `Order Completed: ${order.orderNumber}`,
      htmlContent: `<p>Your delivery for <strong>${order.orderNumber}</strong> has been marked as confirmed. Thank you for trading on Oja.</p>`,
      type: 'order_delivered',
      sentAt: new Date().toISOString(),
      metadata: { orderId: order.id, subOrderId },
    });
    MockStorage.setEmailOutbox(emails);

    return order;
  }

  async getOrdersForUser(userId: string): Promise<Order[]> {
    const orders = MockStorage.getOrders();
    return orders.filter(
      (o) => o.buyerId === userId || o.subOrders.some((s) => s.sellerId === userId || s.agentId === userId)
    );
  }

  async getAllOrders(): Promise<Order[]> {
    return MockStorage.getOrders();
  }

  async getAvailableDeliveries(agentId: string): Promise<AvailableDelivery[]> {
    // Delivery board parity with the available_deliveries RPC: ready,
    // unclaimed, and hall-gender eligible for this agent, oldest first.
    const users = MockStorage.getUsers();
    const agent = users.find((u) => u.id === agentId);
    if (!agent || !agent.badges.includes('Delivery Agent')) return [];
    const halls = MockStorage.getHalls();
    const board: AvailableDelivery[] = [];
    for (const order of MockStorage.getOrders()) {
      for (const sub of order.subOrders) {
        if (sub.status !== 'ready' || sub.agentId) continue;
        const seller = users.find((u) => u.id === sub.sellerId);
        const hallGender = halls.find((h) => h.id === seller?.hallId)?.gender;
        if (hallGender && hallGender !== 'mixed' && hallGender !== agent.gender) continue;
        board.push({
          subOrderId: sub.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMode: order.paymentMode,
          sellerHallId: seller?.hallId || '',
          deliveryHallId: order.deliveryHallId,
          deliveryRoom: order.deliveryRoom,
          subtotal: sub.subtotal,
          deliveryFee: sub.deliveryFee,
          itemsCount: sub.itemsCount,
          createdAt: sub.statusTimeline[sub.statusTimeline.length - 1]?.timestamp || order.createdAt,
          items: sub.items.map((i) => ({ title: i.title, quantity: i.quantity })),
        });
      }
    }
    return board.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async markSellerPayoutPaid(subOrderId: string): Promise<void> {
    const orders = MockStorage.getOrders();
    for (const ord of orders) {
      const sub = ord.subOrders.find((s) => s.id === subOrderId);
      if (sub) {
        if (sub.sellerPaidOut) {
          throw new Error('Seller payout has already been dispatched for this sub-order.');
        }
        sub.sellerPaidOut = true;
        MockStorage.setOrders(orders);
        this.addNotification({
          userId: sub.sellerId,
          title: 'Payout Dispatched',
          message: `Payout of ₦${sub.sellerPayoutAmount.toLocaleString()} for order ${ord.orderNumber} has been paid to your bank account.`,
          type: 'seller',
        });
        return;
      }
    }
  }

  // --- Reviews ---
  async getReviewsForListing(listingId: string): Promise<Review[]> {
    const reviews = MockStorage.getReviews();
    return reviews.filter((r) => r.listingId === listingId);
  }

  async getReviewsForAgent(agentId: string): Promise<Review[]> {
    const reviews = MockStorage.getReviews();
    return reviews.filter((r) => r.agentId === agentId && r.agentRating);
  }

  async createReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    // M-05: Enforce that reviewer actually has a COMPLETED order for this listing
    const orders = MockStorage.getOrders();
    const hasCompletedOrder = orders.some(
      (o) =>
        o.buyerId === data.reviewerId &&
        o.subOrders.some(
          (s) =>
            s.status === 'completed' &&
            s.items.some((i) => i.listingId === data.listingId)
        )
    );

    if (!hasCompletedOrder) {
      throw new Error('Only verified buyers with a completed order for this item can leave a review.');
    }

    const listings = MockStorage.getListings();
    const targetListing = listings.find((l) => l.id === data.listingId);
    const sellerId = data.sellerId || targetListing?.sellerId;

    const reviews = MockStorage.getReviews();
    const newRev: Review = {
      ...data,
      sellerId,
      id: 'rev_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    reviews.unshift(newRev);
    MockStorage.setReviews(reviews);

    // Update seller rating stats
    if (sellerId) {
      const users = MockStorage.getUsers();
      const seller = users.find((u) => u.id === sellerId);
      if (seller) {
        const sellerReviews = reviews.filter((r) => r.sellerId === sellerId);
        seller.ratingCount = sellerReviews.length;
        seller.ratingAverage =
          sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
        MockStorage.setUsers(users);
      }
    }

    // M-05: aggregate delivery-agent ratings the same way
    if (data.agentId && data.agentRating) {
      const users = MockStorage.getUsers();
      const agent = users.find((u) => u.id === data.agentId);
      if (agent) {
        const agentReviews = reviews.filter((r) => r.agentId === data.agentId && r.agentRating);
        agent.ratingCount = agentReviews.length;
        agent.ratingAverage =
          agentReviews.reduce((sum, r) => sum + (r.agentRating || 0), 0) / agentReviews.length;
        MockStorage.setUsers(users);
      }
    }

    return newRev;
  }

  // --- Reports ---
  async createReport(data: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<Report> {
    const reports = MockStorage.getReports();
    const newRep: Report = {
      ...data,
      id: 'rep_' + Date.now(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    reports.push(newRep);
    MockStorage.setReports(reports);

    // If report is on a listing, flag isReported on the listing
    if (data.targetType === 'listing') {
      const listings = MockStorage.getListings();
      const listing = listings.find((l) => l.id === data.targetId);
      if (listing) {
        listing.isReported = true;
        MockStorage.setListings(listings);
      }
    }

    return newRep;
  }

  async getReports(): Promise<Report[]> {
    return MockStorage.getReports();
  }

  async resolveReport(reportId: string, action: 'resolved' | 'dismissed'): Promise<void> {
    const reports = MockStorage.getReports();
    const rep = reports.find((r) => r.id === reportId);
    if (rep) {
      rep.status = action;
      rep.resolvedAt = new Date().toISOString();
      MockStorage.setReports(reports);
    }
  }

  // --- Chat ---
  async getThreadsForUser(userId: string): Promise<ChatThread[]> {
    const threads = MockStorage.getThreads();
    return threads.filter((t) => t.participantIds.includes(userId));
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const messages = MockStorage.getMessages();
    return messages.filter((m) => m.threadId === threadId);
  }

  async sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const messages = MockStorage.getMessages();
    const threads = MockStorage.getThreads();
    const newMsg: ChatMessage = {
      ...msg,
      id: 'msg_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    messages.push(newMsg);
    MockStorage.setMessages(messages);

    const thread = threads.find((t) => t.id === msg.threadId);
    if (thread) {
      thread.lastMessageSnippet = msg.content;
      thread.lastMessageAt = newMsg.createdAt;
      MockStorage.setThreads(threads);
    }

    return newMsg;
  }

  async blockUser(threadId: string, blockerId: string): Promise<void> {
    const threads = MockStorage.getThreads();
    const thread = threads.find((t) => t.id === threadId);
    if (thread) {
      thread.isBlockedBy = blockerId;
      MockStorage.setThreads(threads);
    }
  }

  async agentRespondToOrderReference(messageId: string, orderId: string, action: 'accept' | 'defer'): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return;
    const orders = MockStorage.getOrders();
    const order = orders.find((o) => o.id === orderId);

    if (order && action === 'accept') {
      for (const sub of order.subOrders) {
        if (!sub.agentId) {
          sub.agentId = currentUser.id;
          sub.status = 'agent_assigned';
          sub.statusTimeline.push({
            state: 'agent_assigned',
            timestamp: new Date().toISOString(),
            note: `Agent ${currentUser.fullName} accepted delivery from chat reference`,
          });
        }
      }
      MockStorage.setOrders(orders);
    }

    // Append response message into thread
    const messages = MockStorage.getMessages();
    const originalMsg = messages.find((m) => m.id === messageId);
    if (originalMsg) {
      await this.sendMessage({
        threadId: originalMsg.threadId,
        senderId: currentUser.id,
        receiverId: originalMsg.senderId,
        content: action === 'accept'
          ? `I have accepted this delivery for ${order?.orderNumber || 'order'}! Coming to pick it up.`
          : `I am currently unavailable for ${order?.orderNumber || 'order'}, please assign another agent.`,
      });
    }
  }

  // --- Notifications ---
  async getNotificationsForUser(userId: string): Promise<AppNotification[]> {
    const notifs = MockStorage.getNotifications();
    return notifs.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(id: string): Promise<void> {
    const notifs = MockStorage.getNotifications();
    const item = notifs.find((n) => n.id === id);
    if (item) {
      item.read = true;
      MockStorage.setNotifications(notifs);
    }
  }

  private addNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    const notifs = MockStorage.getNotifications();
    notifs.unshift({
      ...data,
      id: 'notif_' + Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
    });
    MockStorage.setNotifications(notifs);
  }

  // --- Admin & System ---
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return MockStorage.getAuditLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async logAdminAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logs = MockStorage.getAuditLogs();
    logs.unshift({
      ...entry,
      id: 'aud_' + Date.now(),
      timestamp: new Date().toISOString(),
    });
    MockStorage.setAuditLogs(logs);
  }

  async getSettings(): Promise<AppSettings> {
    return MockStorage.getSettings();
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const settings = MockStorage.getSettings();
    const updated = { ...settings, ...updates };
    MockStorage.setSettings(updated);
    return updated;
  }

  async getHalls(): Promise<Hall[]> {
    return MockStorage.getHalls();
  }

  async updateHall(hall: Hall): Promise<void> {
    const halls = MockStorage.getHalls();
    const idx = halls.findIndex((h) => h.id === hall.id);
    if (idx !== -1) {
      halls[idx] = hall;
    } else {
      halls.push(hall);
    }
    MockStorage.setHalls(halls);
  }

  async getCategories(): Promise<Category[]> {
    return MockStorage.getCategories();
  }

  async updateCategory(cat: Category): Promise<void> {
    const cats = MockStorage.getCategories();
    const idx = cats.findIndex((c) => c.id === cat.id);
    if (idx !== -1) {
      cats[idx] = cat;
    } else {
      cats.push(cat);
    }
    MockStorage.setCategories(cats);
  }

  // --- Dev Outbox & Sweeps ---
  async getDevEmailOutbox(): Promise<any[]> {
    return MockStorage.getEmailOutbox();
  }

  async runScheduledSweeps(): Promise<void> {
    const orders = MockStorage.getOrders();
    const now = Date.now();
    let ordersChanged = false;

    // 1. Auto-confirm delivered orders after 48 hours
    for (const ord of orders) {
      for (const sub of ord.subOrders) {
        if (sub.status === 'delivered' && sub.deliveredAt) {
          const deliveredTime = new Date(sub.deliveredAt).getTime();
          const hoursSinceDelivery = (now - deliveredTime) / (1000 * 60 * 60);
          if (hoursSinceDelivery >= 48) {
            sub.status = 'completed';
            sub.completedAt = new Date().toISOString();
            sub.statusTimeline.push({
              state: 'completed',
              timestamp: new Date().toISOString(),
              note: 'Order auto-completed after 48h delivery window expired. Seller payout unlocked.',
            });
            // Late penalty still applies on auto-confirm when the seller beat
            // the clock late: same math as buyer-confirmed receipt.
            if (sub.sellerAcceptedAt && sub.deliveryTimeAgreedHours) {
              const accepted = new Date(sub.sellerAcceptedAt).getTime();
              const completed = new Date(sub.completedAt).getTime();
              const hoursLate = (completed - accepted) / (1000 * 60 * 60) - sub.deliveryTimeAgreedHours;
              if (hoursLate > 0) {
                const penalty = calculateLatePenalty(sub.subtotal, hoursLate);
                sub.penaltyAmount = penalty.penaltyAmount;
                sub.sellerPayoutAmount = Math.max(0, sub.subtotal - penalty.penaltyAmount);
                // 2-day-late admin alert: funds stay held until an admin acts.
                if (penalty.isAlertLevel) {
                  const admins = MockStorage.getUsers().filter((u) => u.adminLevel);
                  for (const admin of admins) {
                    this.addNotification({
                      userId: admin.id,
                      title: 'Late Delivery Alert',
                      message: `Order ${ord.orderNumber} completed ${penalty.daysLate} days late. Penalty N${penalty.penaltyAmount.toLocaleString()} held from seller payout.`,
                      type: 'order',
                      linkId: ord.id,
                    });
                  }
                }
              }
            }
            ordersChanged = true;
          }
        }
      }
      if (ord.subOrders.every((s) => s.status === 'completed')) {
        ord.status = 'completed';
      }
    }

    if (ordersChanged) {
      MockStorage.setOrders(orders);
    }

    // 2. Auto-purge recycle bin after 30 days
    const listings = MockStorage.getListings();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const remainingListings = listings.filter((l) => {
      if (l.status === 'in_recycle_bin' && l.recycledAt) {
        return new Date(l.recycledAt).getTime() > thirtyDaysAgo;
      }
      return true;
    });

    if (remainingListings.length !== listings.length) {
      MockStorage.setListings(remainingListings);
    }
  }
}
