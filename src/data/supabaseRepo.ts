/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Repository,
  PlaceOrderInput,
  AdminUserUpdates,
  AvailableDelivery,
} from './repo';
import { isOnlyDeliveryAgentDiff } from '../utils/adminGuards';
import { logUserAction } from '../utils/feedback';
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
  FeedbackItem,
  FeedbackStatus,
} from '../types';

export class SupabaseRepository implements Repository {
  readonly isMock = false;
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  // --- Auth & Profiles ---
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user }, error: authError } = await this.client.auth.getUser();
    if (authError || !user) return null;
    const { data, error } = await this.client.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) return null;
    return this.mapProfile(data);
  }

  async switchUser(userId: string): Promise<UserProfile | null> {
    return this.getUserById(userId);
  }

  async getUsers(): Promise<UserProfile[]> {
    // M-02: full profiles are owner/admin-only under RLS. Anonymous shoppers
    // and non-admin users read the public_profiles view (no room, matric/reg,
    // emails, or bank details); admins still get full rows.
    const { data, error } = await this.client.from('profiles').select('*');
    if (!error) return (data || []).map(this.mapProfile);
    const { data: pub, error: pubError } = await this.client.from('public_profiles').select('*');
    if (pubError) throw error;
    return (pub || []).map(this.mapPublicProfile);
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', id).single();
    if (!error && data) return this.mapProfile(data);
    // M-02: fall back to the public view when the caller may not read the
    // private row (e.g. a shopper opening a seller storefront).
    const { data: pub, error: pubError } = await this.client.from('public_profiles').select('*').eq('id', id).single();
    if (pubError || !pub) return null;
    return this.mapPublicProfile(pub);
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // B-04: Only permit non-privileged columns in user self-updates.
    // Bank details are the seller's own payout data, so self-update is allowed.
    const payload: any = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.hallId !== undefined) payload.hall_id = updates.hallId;
    if (updates.roomNumber !== undefined) payload.room_number = updates.roomNumber;
    if (updates.telegramHandle !== undefined) payload.telegram_handle = updates.telegramHandle;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.matricNumber !== undefined) payload.matric_number = updates.matricNumber;
    if (updates.regNumber !== undefined) payload.reg_number = updates.regNumber;
    if (updates.personalEmail !== undefined) payload.personal_email = updates.personalEmail;
    if (updates.bankDetails !== undefined) payload.bank_details = updates.bankDetails;

    const { data, error } = await this.client.from('profiles').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this.mapProfile(data);
  }

  async adminUpdateUser(actorId: string, targetId: string, updates: AdminUserUpdates): Promise<UserProfile> {
    // H-03: same guards as the mock repo (defense in depth). The trigger and
    // profiles_admin_update RLS policy enforce them server-side regardless.
    const { FOUNDING_SUPER_ADMIN_EMAILS } = await import('../config/appConfig');
    const actor = await this.getUserById(actorId);
    if (!actor?.adminLevel) throw new Error('Admin privileges required.');
    const target = await this.getUserById(targetId);
    if (!target) throw new Error('User not found');
    if (actorId === targetId) {
      throw new Error('You cannot change your own role, badges, or suspension status.');
    }
    const wantsRoleChange = updates.adminLevel !== undefined || updates.badges !== undefined;
    const wantsModeration =
      updates.isSuspended !== undefined ||
      updates.isSellerApproved !== undefined ||
      updates.sellerApplicationStatus !== undefined;
    const isSuper = actor.adminLevel === 'super_admin';
    const isMod = actor.adminLevel === 'moderator';
    const isLogistics = actor.adminLevel === 'logistics_admin';
    if (wantsRoleChange && !isSuper) {
      const nextBadges = updates.badges !== undefined ? [...updates.badges] : [...target.badges];
      const onlyAgentBadge =
        updates.adminLevel === undefined && isLogistics && isOnlyDeliveryAgentDiff(target.badges, nextBadges);
      if (!onlyAgentBadge) throw new Error('Only a Super admin can change badges or admin levels.');
    }
    if (wantsModeration && !(isSuper || isMod)) {
      throw new Error('Only a Super admin or Moderator can suspend users or approve sellers.');
    }
    const targetEmails = [target.personalEmail, target.schoolEmail].map((e) => (e || '').toLowerCase());
    const isFounding = FOUNDING_SUPER_ADMIN_EMAILS.some((f) => targetEmails.includes(f.toLowerCase()));
    const demoting = target.adminLevel === 'super_admin' && updates.adminLevel !== undefined && updates.adminLevel !== 'super_admin';
    if (isFounding && (demoting || updates.isSuspended === true)) {
      throw new Error('Founding admins are protected from demotion and suspension.');
    }

    const before = {
      badges: [...target.badges],
      adminLevel: target.adminLevel ?? null,
      isSuspended: target.isSuspended,
      isSellerApproved: target.isSellerApproved,
      sellerApplicationStatus: target.sellerApplicationStatus ?? 'none',
    };
    let badges = updates.badges !== undefined ? [...updates.badges] : [...target.badges];
    if (badges.includes('Verified Seller') && !badges.includes('Seller')) badges.push('Seller');

    const payload: any = { badges };
    if (updates.adminLevel !== undefined) payload.admin_level = updates.adminLevel;
    if (updates.isSuspended !== undefined) payload.is_suspended = updates.isSuspended;
    if (updates.isSellerApproved !== undefined) payload.is_seller_approved = updates.isSellerApproved;
    if (updates.sellerApplicationStatus !== undefined) payload.seller_application_status = updates.sellerApplicationStatus;
    const { data, error } = await this.client.from('profiles').update(payload).eq('id', targetId).select().single();
    if (error) throw error;
    const updated = this.mapProfile(data);
    await this.logAdminAction({
      adminId: actor.id,
      adminEmail: actor.personalEmail || actor.schoolEmail,
      action: 'ADMIN_USER_UPDATE',
      targetType: 'USER',
      targetId: target.id,
      details: JSON.stringify({
        before,
        after: {
          badges: [...updated.badges],
          adminLevel: updated.adminLevel ?? null,
          isSuspended: updated.isSuspended,
          isSellerApproved: updated.isSellerApproved,
          sellerApplicationStatus: updated.sellerApplicationStatus ?? 'none',
        },
      }),
    });
    return updated;
  }

  async applyForSeller(userId: string, bankDetails: BankDetails): Promise<void> {
    const { error } = await this.client.from('profiles').update({
      bank_details: bankDetails,
      seller_application_status: 'pending',
      seller_application_date: new Date().toISOString(),
    }).eq('id', userId);
    if (error) throw error;
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;
    const { error } = await this.client.auth.verifyOtp({
      email: user.schoolEmail || user.personalEmail,
      token: code,
      type: 'signup',
    });
    return !error;
  }

  async signInWithGoogleSchool(schoolEmail: string, fullName: string): Promise<UserProfile> {
    const clean = schoolEmail.trim().toLowerCase();
    if (!clean.endsWith('@stu.cu.edu.ng') && clean !== 'tobilobajagun@gmail.com') {
      throw new Error('Only official Covenant University emails (@stu.cu.edu.ng) are accepted.');
    }
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { hd: 'stu.cu.edu.ng' } },
    });
    if (error) throw error;
    const current = await this.getCurrentUser();
    if (!current) throw new Error('Authentication initiated. Awaiting callback.');
    return current;
  }

  async signInWithEmailPassword(email: string): Promise<UserProfile> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password: 'OjaSchoolSecureAuth2026!',
    });
    if (error) throw error;
    const profile = await this.getUserById(data.user.id);
    if (!profile) throw new Error('Profile not found.');
    return profile;
  }

  async signUp(data: Partial<UserProfile>): Promise<UserProfile> {
    const cleanEmail = (data.schoolEmail || data.personalEmail || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@stu.cu.edu.ng') && cleanEmail !== 'tobilobajagun@gmail.com') {
      throw new Error('Covenant University student email must end in @stu.cu.edu.ng');
    }
    const { data: authData, error } = await this.client.auth.signUp({
      email: cleanEmail,
      password: 'OjaSchoolSecureAuth2026!',
      options: {
        data: {
          full_name: data.fullName,
          username: data.username,
          hall_id: data.hallId,
          room_number: data.roomNumber,
          gender: data.gender,
          telegram_handle: data.telegramHandle,
        },
      },
    });
    if (error) throw error;
    if (!authData.user) throw new Error('Failed to register user account.');
    // No trigger creates the profile row (triggers on auth.users need the
    // dashboard Auth Hook), so insert it explicitly. RLS profiles_insert_own
    // scopes the row to the new user's id.
    const { error: profileError } = await this.client.from('profiles').insert({
      id: authData.user.id,
      full_name: data.fullName || 'Student',
      username: data.username || cleanEmail.split('@')[0],
      school_email: cleanEmail,
      personal_email: (data.personalEmail || '').trim().toLowerCase() || null,
      hall_id: data.hallId,
      room_number: data.roomNumber || '',
      gender: data.gender || 'male',
      telegram_handle: data.telegramHandle || '',
    });
    if (profileError) throw profileError;
    const profile = await this.getUserById(authData.user.id);
    return profile || (await this.getCurrentUser())!;
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  // --- Listings ---
  async getListings(includeRecycled = false): Promise<Listing[]> {
    let query = this.client.from('listings').select('*');
    if (!includeRecycled) {
      query = query.in('status', ['active', 'sold_out']);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapListing);
  }

  async getListingById(id: string): Promise<Listing | null> {
    const { data, error } = await this.client.from('listings').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapListing(data);
  }

  async createListing(listing: Omit<Listing, 'id' | 'createdAt' | 'viewsCount' | 'isReported'>): Promise<Listing> {
    const payload = {
      title: listing.title,
      description: listing.description,
      category_id: listing.categoryId,
      condition: listing.condition,
      price: listing.price,
      stock: listing.stock,
      images: listing.images,
      seller_id: listing.sellerId,
      business_id: listing.businessId || null,
      post_as: listing.postAs,
      default_delivery_days: listing.defaultDeliveryDays,
      dynamic_values: listing.dynamicValues,
      status: 'active',
    };
    const { data, error } = await this.client.from('listings').insert(payload).select().single();
    if (error) throw error;
    return this.mapListing(data);
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const payload: any = { ...updates };
    if (updates.categoryId) payload.category_id = updates.categoryId;
    if (updates.defaultDeliveryDays) payload.default_delivery_days = updates.defaultDeliveryDays;
    if (updates.dynamicValues) payload.dynamic_values = updates.dynamicValues;
    const { data, error } = await this.client.from('listings').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return this.mapListing(data);
  }

  async moveToRecycleBin(id: string): Promise<void> {
    const { error } = await this.client.from('listings').update({ status: 'in_recycle_bin', recycled_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async restoreFromRecycleBin(id: string): Promise<void> {
    const { error } = await this.client.from('listings').update({ status: 'active', recycled_at: null }).eq('id', id);
    if (error) throw error;
  }

  async permanentlyDeleteListing(id: string): Promise<void> {
    const { error } = await this.client.from('listings').delete().eq('id', id);
    if (error) throw error;
  }

  async incrementListingViews(id: string): Promise<void> {
    await this.client.rpc('increment_listing_views', { listing_id: id });
  }

  // --- Businesses ---
  async getBusinesses(): Promise<Business[]> {
    const { data, error } = await this.client.from('businesses').select('*');
    if (error) throw error;
    return (data || []).map(this.mapBusiness);
  }

  async getBusinessById(id: string): Promise<Business | null> {
    const { data, error } = await this.client.from('businesses').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapBusiness(data);
  }

  async createBusiness(biz: Omit<Business, 'id' | 'createdAt' | 'followerIds' | 'status' | 'blockedMemberIds'>): Promise<Business> {
    const payload = {
      name: biz.name,
      handle: biz.handle,
      description: biz.description,
      logo: biz.logo,
      banner: biz.banner,
      category_id: biz.categoryId,
      contact: biz.contact,
      owner_id: biz.ownerId,
      status: 'pending',
      proof_url: biz.proofUrl,
      members_post_freely: biz.membersPostFreely,
      member_ids: biz.memberIds,
    };
    const { data, error } = await this.client.from('businesses').insert(payload).select().single();
    if (error) throw error;
    return this.mapBusiness(data);
  }

  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const { data, error } = await this.client.from('businesses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return this.mapBusiness(data);
  }

  async toggleFollowBusiness(businessId: string, userId: string): Promise<boolean> {
    const biz = await this.getBusinessById(businessId);
    if (!biz) return false;
    const exists = biz.followerIds.includes(userId);
    const newFollowers = exists
      ? biz.followerIds.filter((id) => id !== userId)
      : [...biz.followerIds, userId];
    await this.client.from('businesses').update({ follower_ids: newFollowers }).eq('id', businessId);
    return !exists;
  }

  async transferBusinessOwnership(businessId: string, newOwnerId: string): Promise<void> {
    const { error } = await this.client.from('businesses').update({ owner_id: newOwnerId }).eq('id', businessId);
    if (error) throw error;
  }

  async requestBusinessOwnershipTransfer(businessId: string, newOwnerId: string): Promise<void> {
    const request = {
      newOwnerId,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    const { error } = await this.client.from('businesses').update({ transfer_request: request }).eq('id', businessId);
    if (error) throw error;
  }

  async approveBusinessOwnershipTransfer(businessId: string, approved: boolean): Promise<void> {
    const biz = await this.getBusinessById(businessId);
    if (!biz || !biz.transferRequest) throw new Error('No pending transfer request.');
    if (approved) {
      await this.client.from('businesses').update({
        owner_id: biz.transferRequest.newOwnerId,
        transfer_request: { ...biz.transferRequest, status: 'approved' },
      }).eq('id', businessId);
    } else {
      await this.client.from('businesses').update({
        transfer_request: { ...biz.transferRequest, status: 'rejected' },
      }).eq('id', businessId);
    }
  }

  async requestJoinBusiness(businessId: string, userId: string): Promise<void> {
    const biz = await this.getBusinessById(businessId);
    if (!biz) throw new Error('Business not found');
    const requests = biz.joinRequests || [];
    if (!requests.includes(userId)) {
      await this.client.from('businesses').update({ join_requests: [...requests, userId] }).eq('id', businessId);
    }
  }

  async approveJoinBusiness(businessId: string, userId: string, approved: boolean): Promise<void> {
    const biz = await this.getBusinessById(businessId);
    if (!biz) throw new Error('Business not found');
    const requests = (biz.joinRequests || []).filter((id) => id !== userId);
    const members = approved && !biz.memberIds.includes(userId) ? [...biz.memberIds, userId] : biz.memberIds;
    await this.client.from('businesses').update({ join_requests: requests, member_ids: members }).eq('id', businessId);
  }

  async blockBusinessMember(businessId: string, memberId: string, blocked: boolean): Promise<void> {
    const biz = await this.getBusinessById(businessId);
    if (!biz) throw new Error('Business not found');
    const blockedIds = biz.blockedMemberIds || [];
    const newBlocked = blocked
      ? (blockedIds.includes(memberId) ? blockedIds : [...blockedIds, memberId])
      : blockedIds.filter((id) => id !== memberId);
    const newMembers = blocked ? biz.memberIds.filter((id) => id !== memberId) : biz.memberIds;
    await this.client.from('businesses').update({ blocked_member_ids: newBlocked, member_ids: newMembers }).eq('id', businessId);
  }

  // --- Orders ---
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const orderNumber = 'OJA-' + Math.floor(1000 + Math.random() * 9000);
    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: orderId, error } = await this.client.rpc('place_order', {
      p_buyer_id: input.buyerId,
      p_delivery_mode: input.deliveryMode,
      p_delivery_hall_id: input.deliveryHallId,
      p_delivery_room: input.deliveryRoom,
      p_delivery_notes: input.deliveryNotes || null,
      p_payment_mode: input.paymentMode,
      p_items: input.items.map((i) => ({ listing_id: i.listingId, quantity: i.quantity })),
      p_order_number: orderNumber,
      p_delivery_code: deliveryCode,
    });
    if (error) throw error;

    const createdOrder = await this.fetchFullOrder(orderId);
    if (!createdOrder) throw new Error('Failed to retrieve placed order.');
    logUserAction(`place order ${createdOrder.orderNumber}`);
    return createdOrder;
  }

  async advanceOrderStatus(orderId: string, subOrderId: string, nextState: OrderState, note?: string, actorId?: string): Promise<Order> {
    const resolvedActorId = await this.resolveActorId(actorId);
    const { error } = await this.client.rpc('advance_order_status', {
      p_order_id: orderId,
      p_sub_order_id: subOrderId,
      p_next_state: nextState,
      p_actor_id: resolvedActorId,
      p_note: note || null,
    });
    if (error) throw error;
    logUserAction(`advance to ${nextState}`);
    return (await this.fetchFullOrder(orderId))!;
  }

  async rejectSubOrder(orderId: string, subOrderId: string, reason: string, actorId?: string): Promise<Order> {
    // Stock rolls back inside restock_sub_order (SECURITY DEFINER); the
    // status moves through the validated RPC so illegal exits are rejected.
    const { error: restockError } = await this.client.rpc('restock_sub_order', { p_sub_order_id: subOrderId });
    if (restockError) throw restockError;
    return this.advanceOrderStatus(orderId, subOrderId, 'cancelled', `Seller rejected: ${reason}`, actorId);
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const order = await this.fetchFullOrder(orderId);
    if (!order) throw new Error('Order not found');
    // Only sub-orders in a cancellable state move; terminal ones are left
    // alone instead of throwing halfway through.
    const cancellable: OrderState[] = ['awaiting_payment', 'payment_confirmed', 'seller_accepted', 'ready', 'agent_assigned', 'disputed'];
    for (const sub of order.subOrders) {
      if (!cancellable.includes(sub.status)) continue;
      const { error: restockError } = await this.client.rpc('restock_sub_order', { p_sub_order_id: sub.id });
      if (restockError) throw restockError;
      await this.advanceOrderStatus(orderId, sub.id, 'cancelled', `Order cancelled: ${reason}`);
    }
    const refreshed = (await this.fetchFullOrder(orderId))!;
    if (refreshed.subOrders.every((s) => s.status === 'cancelled')) {
      await this.client.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
      return (await this.fetchFullOrder(orderId))!;
    }
    return refreshed;
  }

  async disputeOrder(orderId: string, reason: string): Promise<Order> {
    const order = await this.fetchFullOrder(orderId);
    if (!order) throw new Error('Order not found');
    for (const sub of order.subOrders) {
      try {
        await this.advanceOrderStatus(orderId, sub.id, 'disputed', `Dispute opened: ${reason}`);
      } catch {
        // Sub-orders that cannot legally dispute (e.g. terminal) are left alone.
      }
    }
    await this.client.from('orders').update({ status: 'disputed' }).eq('id', orderId);
    return (await this.fetchFullOrder(orderId))!;
  }

  async extendDeliveryPromise(orderId: string, subOrderId: string, additionalHours: number, reason: string, actorId?: string): Promise<Order> {
    const resolvedActorId = await this.resolveActorId(actorId);
    const { error } = await this.client.rpc('extend_delivery_promise', {
      p_sub_order_id: subOrderId,
      p_actor_id: resolvedActorId,
      p_additional_hours: additionalHours,
      p_reason: reason,
    });
    if (error) throw error;
    return (await this.fetchFullOrder(orderId))!;
  }

  async submitPaymentDetails(orderId: string, reference: string, senderName: string, amount: number): Promise<Order> {
    const { error } = await this.client.from('orders').update({
      payment_reference: reference,
      sender_account_name: senderName,
      payment_amount_paid: amount,
      payment_status: 'pending_verification',
    }).eq('id', orderId);
    if (error) throw error;
    return (await this.fetchFullOrder(orderId))!;
  }

  async verifyPayment(orderId: string, approved: boolean, note?: string): Promise<Order> {
    const order = await this.fetchFullOrder(orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentStatus === 'verified') throw new Error('Payment already verified.');

    if (approved) {
      // Each sub-order moves through the validated RPC (role + legality).
      for (const sub of order.subOrders) {
        if (sub.status === 'awaiting_payment') {
          await this.advanceOrderStatus(orderId, sub.id, 'payment_confirmed', note || 'Payment verified by admin');
        }
      }
      await this.client.from('orders').update({ payment_status: 'verified', status: 'payment_confirmed' }).eq('id', orderId);
    } else {
      await this.client.from('orders').update({ payment_status: 'rejected' }).eq('id', orderId);
    }
    return (await this.fetchFullOrder(orderId))!;
  }

  async sellerAcceptSubOrder(orderId: string, subOrderId: string, agreedHours: number, actorId?: string): Promise<Order> {
    const resolvedActorId = await this.resolveActorId(actorId);
    const { error } = await this.client.rpc('seller_accept_sub_order', {
      p_sub_order_id: subOrderId,
      p_actor_id: resolvedActorId,
      p_agreed_hours: agreedHours,
    });
    if (error) throw error;
    return (await this.fetchFullOrder(orderId))!;
  }

  async assignDeliveryAgent(orderId: string, subOrderId: string, agentId: string): Promise<Order> {
    // Atomic claim with eligibility inside agent_claim_sub_order: one winner,
    // losers get a clear error instead of a silent overwrite.
    const { error } = await this.client.rpc('agent_claim_sub_order', {
      p_sub_order_id: subOrderId,
      p_agent_id: agentId,
    });
    if (error) throw error;
    return (await this.fetchFullOrder(orderId))!;
  }

  async completeDeliveryWithCode(orderId: string, subOrderId: string, code: string, actorId?: string): Promise<boolean> {
    const resolvedActorId = await this.resolveActorId(actorId);
    const { error } = await this.client.rpc('delivery_complete_with_code', {
      p_sub_order_id: subOrderId,
      p_actor_id: resolvedActorId,
      p_code: code,
    });
    if (error) {
      // Wrong code stays a false return (form-level concern); auth and state
      // violations throw so the caller can explain them.
      if (error.message.includes('mismatch')) return false;
      throw error;
    }
    return true;
  }

  async confirmBuyerReceipt(orderId: string, subOrderId: string): Promise<Order> {
    const completedAt = Date.now();
    const updated = await this.advanceOrderStatus(orderId, subOrderId, 'completed', 'Buyer confirmed receipt. Seller payout unlocked.');

    // Late penalty on the confirmed handover.
    const sub = updated.subOrders.find((s) => s.id === subOrderId);
    if (sub?.sellerAcceptedAt && sub?.deliveryTimeAgreedHours) {
      const accepted = new Date(sub.sellerAcceptedAt).getTime();
      const hoursLate = (completedAt - accepted) / (1000 * 60 * 60) - sub.deliveryTimeAgreedHours;
      if (hoursLate > 0) {
        await this.client.rpc('apply_late_penalty', { p_sub_order_id: subOrderId, p_hours_late: hoursLate });
        return (await this.fetchFullOrder(orderId))!;
      }
    }
    return updated;
  }

  async getAvailableDeliveries(agentId: string): Promise<AvailableDelivery[]> {
    const { data, error } = await this.client.rpc('available_deliveries', { p_agent_id: agentId });
    if (error) throw error;
    const rows = (data || []) as any[];
    return rows.map((r) => ({
      subOrderId: r.sub_order_id,
      orderId: r.order_id,
      orderNumber: r.order_number,
      paymentMode: r.payment_mode,
      sellerHallId: r.seller_hall_id,
      deliveryHallId: r.delivery_hall_id,
      deliveryRoom: r.delivery_room,
      subtotal: Number(r.subtotal),
      deliveryFee: Number(r.delivery_fee),
      itemsCount: Number(r.items_count),
      createdAt: r.created_at,
      items: (r.items || []).map((i: any) => ({ title: i.title, quantity: Number(i.quantity) })),
    }));
  }

  async getOrdersForUser(userId: string): Promise<Order[]> {
    const { data: orders, error } = await this.client.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const fullOrders: Order[] = [];
    for (const ord of orders || []) {
      const full = await this.fetchFullOrder(ord.id);
      if (full && (full.buyerId === userId || full.subOrders.some((s) => s.sellerId === userId || s.agentId === userId))) {
        fullOrders.push(full);
      }
    }
    return fullOrders;
  }

  async getAllOrders(): Promise<Order[]> {
    const { data: orders, error } = await this.client.from('orders').select('id').order('created_at', { ascending: false });
    if (error) throw error;
    const list: Order[] = [];
    for (const row of orders || []) {
      const full = await this.fetchFullOrder(row.id);
      if (full) list.push(full);
    }
    return list;
  }

  async markSellerPayoutPaid(subOrderId: string): Promise<void> {
    const { data: sub } = await this.client.from('sub_orders').select('seller_paid_out').eq('id', subOrderId).single();
    if (sub?.seller_paid_out) throw new Error('Seller payout already disbursed.');
    const { error } = await this.client.from('sub_orders').update({ seller_paid_out: true }).eq('id', subOrderId);
    if (error) throw error;
  }

  // --- Reviews ---
  async getReviewsForListing(listingId: string): Promise<Review[]> {
    const { data, error } = await this.client.from('reviews').select('*').eq('listing_id', listingId);
    if (error) throw error;
    return (data || []).map(this.mapReview);
  }

  async getReviewsForAgent(agentId: string): Promise<Review[]> {
    const { data, error } = await this.client.from('reviews').select('*').eq('agent_id', agentId).not('agent_rating', 'is', null);
    if (error) throw error;
    return (data || []).map(this.mapReview);
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    // reviews table uses reviewer_id (the eligibility trigger checks it).
    const payload = {
      listing_id: review.listingId,
      sub_order_id: review.subOrderId || null,
      order_id: review.orderId,
      reviewer_id: review.reviewerId,
      seller_id: review.sellerId || null,
      rating: review.rating,
      comment: review.comment,
      agent_id: review.agentId || null,
      agent_rating: review.agentRating || null,
      agent_comment: review.agentComment || null,
    };
    const { data, error } = await this.client.from('reviews').insert(payload).select().single();
    if (error) throw error;
    return this.mapReview(data);
  }

  // --- Reports ---
  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<Report> {
    const payload = {
      reporter_id: report.reporterId,
      target_type: report.targetType,
      target_id: report.targetId,
      target_title: report.targetTitle,
      reason: report.reason,
      status: 'pending',
    };
    const { data, error } = await this.client.from('reports').insert(payload).select().single();
    if (error) throw error;
    return this.mapReport(data);
  }

  async getReports(): Promise<Report[]> {
    const { data, error } = await this.client.from('reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapReport);
  }

  async resolveReport(reportId: string, action: 'resolved' | 'dismissed'): Promise<void> {
    const { error } = await this.client.from('reports').update({ status: action }).eq('id', reportId);
    if (error) throw error;
  }

  // --- Feedback (6.3: feedback table in Supabase mode) ---
  async saveFeedback(fb: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): Promise<FeedbackItem> {
    const payload = {
      type: fb.type,
      message: fb.message,
      contact: fb.contact || null,
      persona_name: fb.personaName || null,
      route: fb.route,
      context: fb.context,
      app_mode: fb.appMode,
      app_version: fb.appVersion,
      browser: fb.browser,
      viewport: fb.viewport,
      timestamp: fb.timestamp,
      breadcrumbs: fb.breadcrumbs,
      last_error: fb.lastError || null,
      status: 'new',
    };
    const { data, error } = await this.client.from('feedback').insert(payload).select().single();
    if (error) throw error;
    return this.mapFeedback(data);
  }

  async getFeedbacks(): Promise<FeedbackItem[]> {
    const { data, error } = await this.client.from('feedback').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapFeedback);
  }

  async updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
    const { error } = await this.client.from('feedback').update({ status }).eq('id', id);
    if (error) throw error;
  }

  // --- Chat ---
  async getThreadsForUser(userId: string): Promise<ChatThread[]> {
    const { data, error } = await this.client.from('chat_threads').select('*').contains('participant_ids', [userId]);
    if (error) throw error;
    return (data || []).map(this.mapThread);
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.client.from('chat_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(this.mapMessage);
  }

  async sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const payload = {
      thread_id: msg.threadId,
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      content: msg.content,
      referenced_order_id: msg.referencedOrderId || null,
      referenced_order_data: msg.referencedOrderData || null,
    };
    const { data, error } = await this.client.from('chat_messages').insert(payload).select().single();
    if (error) throw error;
    return this.mapMessage(data);
  }

  async blockUser(threadId: string, blockerId: string): Promise<void> {
    // chat_threads carries is_blocked_by (see schema); the reader accepts the
    // legacy blocked_by name as a fallback.
    const { error } = await this.client.from('chat_threads').update({ is_blocked_by: blockerId }).eq('id', threadId);
    if (error) throw error;
  }

  async agentRespondToOrderReference(messageId: string, orderId: string, action: 'accept' | 'defer'): Promise<void> {
    const { error } = await this.client.from('chat_messages').update({
      referenced_order_data: { agentAction: action, actionTimestamp: new Date().toISOString() },
    }).eq('id', messageId);
    if (error) throw error;
  }

  // --- Notifications ---
  async getNotificationsForUser(userId: string): Promise<AppNotification[]> {
    const { data, error } = await this.client.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.client.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  }

  // --- Dev Outbox & Sweeps ---
  async getDevEmailOutbox(): Promise<any[]> {
    return [];
  }

  async runScheduledSweeps(): Promise<void> {
    // In production Supabase, triggers and cron handle sweeps
  }

  // --- Admin ---
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const { data, error } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.mapAuditLog);
  }

  async logAdminAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await this.client.from('audit_logs').insert({
      admin_id: entry.adminId,
      admin_email: entry.adminEmail,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      details: entry.details,
    });
    if (error) throw error;
  }

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await this.client.from('app_settings').select('*').eq('id', 1).single();
    if (error || !data) {
      return {
        ojaBankName: 'Kuda Microfinance Bank',
        ojaAccountNumber: '2001928374',
        ojaAccountName: 'Oja Escrow Operations',
        deliveryPromiseHours: 48,
        latePenaltyRatePercent: 5,
        lateThresholdDaysAlert: 2,
      };
    }
    return {
      ojaBankName: data.oja_bank_name,
      ojaAccountNumber: data.oja_account_number,
      ojaAccountName: data.oja_account_name,
      deliveryPromiseHours: data.delivery_promise_hours || 48,
      latePenaltyRatePercent: data.late_penalty_rate_percent || 5,
      lateThresholdDaysAlert: data.late_threshold_days_alert || 2,
    };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const payload: any = {};
    if (updates.ojaBankName) payload.oja_bank_name = updates.ojaBankName;
    if (updates.ojaAccountNumber) payload.oja_account_number = updates.ojaAccountNumber;
    if (updates.ojaAccountName) payload.oja_account_name = updates.ojaAccountName;
    const { data, error } = await this.client.from('app_settings').update(payload).eq('id', 1).select().single();
    if (error) throw error;
    return this.getSettings();
  }

  async getHalls(): Promise<Hall[]> {
    const { data, error } = await this.client.from('halls').select('*');
    if (error) throw error;
    return (data || []).map((h) => ({
      id: h.id,
      name: h.name,
      gender: h.gender,
      active: h.active,
    }));
  }

  async updateHall(hall: Hall): Promise<void> {
    const { error } = await this.client.from('halls').upsert({
      id: hall.id,
      name: hall.name,
      gender: hall.gender,
      active: hall.active,
    });
    if (error) throw error;
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client.from('categories').select('*');
    if (error) throw error;
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      iconName: c.icon_name,
      dynamicFields: c.dynamic_fields || [],
    }));
  }

  async updateCategory(cat: Category): Promise<void> {
    const { error } = await this.client.from('categories').upsert({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon_name: cat.iconName,
      dynamic_fields: cat.dynamicFields,
    });
    if (error) throw error;
  }

  // --- Helpers ---
  private async resolveActorId(explicit?: string): Promise<string> {
    if (explicit) return explicit;
    const { data: { user } } = await this.client.auth.getUser();
    if (!user?.id) throw new Error('Sign in required.');
    return user.id;
  }

  private async fetchFullOrder(orderId: string): Promise<Order | null> {
    const { data: ord, error: ordError } = await this.client.from('orders').select('*').eq('id', orderId).single();
    if (ordError || !ord) return null;

    const { data: subOrdersRaw, error: subError } = await this.client.from('sub_orders').select('*').eq('order_id', orderId);
    if (subError) throw subError;

    const subOrders: SubOrder[] = [];
    for (const sub of subOrdersRaw || []) {
      const { data: itemsRaw } = await this.client.from('order_items').select('*').eq('sub_order_id', sub.id);
      subOrders.push({
        id: sub.id,
        orderId: sub.order_id,
        sellerId: sub.seller_id,
        businessId: sub.business_id,
        status: sub.status,
        subtotal: Number(sub.subtotal),
        deliveryFee: Number(sub.delivery_fee),
        itemsCount: sub.items_count,
        penaltyAmount: Number(sub.penalty_amount || 0),
        sellerPayoutAmount: Number(sub.seller_payout_amount || sub.subtotal),
        sellerPaidOut: sub.seller_paid_out,
        deliveryTimeAgreedHours: sub.delivery_time_agreed_hours,
        sellerAcceptedAt: sub.seller_accepted_at,
        agentId: sub.agent_id,
        completedAt: sub.completed_at,
        statusTimeline: sub.status_timeline || [],
        items: (itemsRaw || []).map((i) => ({
          id: i.id,
          listingId: i.listing_id,
          title: i.title,
          price: Number(i.price),
          quantity: i.quantity,
          image: i.image,
          categoryId: i.category_id,
        })),
      });
    }

    return {
      id: ord.id,
      orderNumber: ord.order_number,
      buyerId: ord.buyer_id,
      deliveryMode: ord.delivery_mode,
      deliveryHallId: ord.delivery_hall_id,
      deliveryRoom: ord.delivery_room,
      deliveryNotes: ord.delivery_notes,
      paymentMode: ord.payment_mode,
      paymentStatus: ord.payment_status,
      paymentReference: ord.payment_reference,
      senderAccountName: ord.sender_account_name,
      paymentAmountPaid: ord.payment_amount_paid ? Number(ord.payment_amount_paid) : undefined,
      deliveryFeeTotal: Number(ord.delivery_fee_total),
      itemsSubtotal: Number(ord.items_subtotal),
      totalAmount: Number(ord.total_amount),
      status: ord.status,
      deliveryCode: ord.delivery_code,
      subOrders,
      createdAt: ord.created_at,
      updatedAt: ord.updated_at,
    };
  }

  private mapProfile(row: any): UserProfile {
    return {
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      personalEmail: row.personal_email || '',
      schoolEmail: row.school_email,
      isSchoolEmailVerified: row.is_school_email_verified,
      isPersonalEmailVerified: row.is_personal_email_verified,
      hallId: row.hall_id,
      roomNumber: row.room_number,
      gender: row.gender,
      telegramHandle: row.telegram_handle,
      matricNumber: row.matric_number,
      regNumber: row.reg_number,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      badges: row.badges || ['Member'],
      adminLevel: row.admin_level,
      bankDetails: row.bank_details,
      isSellerApproved: row.is_seller_approved,
      sellerApplicationStatus: row.seller_application_status,
      sellerApplicationDate: row.seller_application_date,
      isSuspended: row.is_suspended,
      ratingAverage: Number(row.rating_average || 5.0),
      ratingCount: Number(row.rating_count || 0),
      createdAt: row.created_at,
    };
  }

  private mapPublicProfile(row: any): UserProfile {
    // Rows from public.public_profiles: safe fields only. Private fields are
    // empty by design so UI code keeps working without ever seeing them.
    return {
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      personalEmail: '',
      schoolEmail: '',
      isSchoolEmailVerified: false,
      isPersonalEmailVerified: false,
      hallId: row.hall_id,
      roomNumber: '',
      gender: row.gender,
      telegramHandle: row.telegram_handle,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      badges: row.badges || ['Member'],
      adminLevel: row.admin_level,
      isSellerApproved: row.is_seller_approved,
      isSuspended: false,
      ratingAverage: Number(row.rating_average || 5.0),
      ratingCount: Number(row.rating_count || 0),
      createdAt: row.created_at,
    };
  }

  private mapListing(row: any): Listing {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      condition: row.condition,
      price: Number(row.price),
      stock: Number(row.stock),
      images: row.images || [],
      sellerId: row.seller_id,
      businessId: row.business_id,
      postAs: row.post_as,
      defaultDeliveryDays: row.default_delivery_days,
      dynamicValues: row.dynamic_values || {},
      status: row.status,
      recycledAt: row.recycled_at,
      createdAt: row.created_at,
      viewsCount: row.views_count || 0,
      isReported: row.is_reported || false,
    };
  }

  private mapBusiness(row: any): Business {
    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      description: row.description,
      logo: row.logo,
      banner: row.banner,
      categoryId: row.category_id,
      contact: row.contact,
      ownerId: row.owner_id,
      status: row.status,
      proofUrl: row.proof_url,
      membersPostFreely: row.members_post_freely,
      memberIds: row.member_ids || [],
      blockedMemberIds: row.blocked_member_ids || [],
      joinRequests: row.join_requests || [],
      transferRequest: row.transfer_request,
      followerIds: row.follower_ids || [],
      createdAt: row.created_at,
    };
  }

  private mapReview(row: any): Review {
    return {
      id: row.id,
      listingId: row.listing_id,
      subOrderId: row.sub_order_id || '',
      orderId: row.order_id,
      reviewerId: row.reviewer_id || row.buyer_id,
      sellerId: row.seller_id,
      rating: Number(row.rating),
      comment: row.comment,
      agentId: row.agent_id,
      agentRating: row.agent_rating ? Number(row.agent_rating) : undefined,
      agentComment: row.agent_comment,
      createdAt: row.created_at,
    };
  }

  private mapReport(row: any): Report {
    return {
      id: row.id,
      reporterId: row.reporter_id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetTitle: row.target_title,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapThread(row: any): ChatThread {
    return {
      id: row.id,
      participantIds: row.participant_ids,
      lastMessageSnippet: row.last_message || row.last_message_snippet || '',
      lastMessageAt: row.last_message_timestamp || row.last_message_at || row.created_at,
      isRequest: row.is_request || false,
      isReported: row.is_reported || false,
      isBlockedBy: row.is_blocked_by || row.blocked_by,
    };
  }

  private mapMessage(row: any): ChatMessage {
    return {
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      referencedOrderId: row.referenced_order_id || row.order_reference_id,
      referencedOrderData: row.referenced_order_data || row.metadata,
      createdAt: row.created_at,
    };
  }

  private mapNotification(row: any): AppNotification {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type,
      read: row.read,
      linkId: row.link_id,
      createdAt: row.created_at,
    };
  }

  private mapFeedback(row: any): FeedbackItem {
    return {
      id: row.id,
      type: row.type,
      message: row.message,
      contact: row.contact || undefined,
      personaName: row.persona_name || undefined,
      route: row.route,
      context: row.context,
      appMode: row.app_mode,
      appVersion: row.app_version,
      browser: row.browser,
      viewport: row.viewport,
      timestamp: row.timestamp,
      breadcrumbs: row.breadcrumbs || [],
      lastError: row.last_error || undefined,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapAuditLog(row: any): AuditLogEntry {    return {
      id: row.id,
      adminId: row.admin_id,
      adminEmail: row.admin_email || '',
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: row.details,
      timestamp: row.timestamp,
    };
  }
}
