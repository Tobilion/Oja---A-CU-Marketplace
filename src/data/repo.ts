/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  Listing,
  Business,
  Order,
  OrderState,
  DeliveryMode,
  PaymentMode,
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

export interface PlaceOrderInput {
  buyerId: string;
  deliveryMode: DeliveryMode;
  deliveryHallId: string;
  deliveryRoom: string;
  deliveryNotes?: string;
  paymentMode: PaymentMode;
  items: { listingId: string; quantity: number }[];
}

export interface Repository {
  readonly isMock: boolean;

  // Auth & Profiles
  getCurrentUser(): Promise<UserProfile | null>;
  switchUser(userId: string): Promise<UserProfile | null>;
  getUsers(): Promise<UserProfile[]>;
  getUserById(id: string): Promise<UserProfile | null>;
  updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  applyForSeller(userId: string, bankDetails: BankDetails): Promise<void>;
  verifyEmailCode(userId: string, code: string): Promise<boolean>;
  signInWithGoogleSchool(schoolEmail: string, fullName: string): Promise<UserProfile>;
  signInWithEmailPassword(email: string): Promise<UserProfile>;
  signUp(data: Partial<UserProfile>): Promise<UserProfile>;
  signOut(): Promise<void>;

  // Listings
  getListings(includeRecycled?: boolean): Promise<Listing[]>;
  getListingById(id: string): Promise<Listing | null>;
  createListing(listing: Omit<Listing, 'id' | 'createdAt' | 'viewsCount' | 'isReported'>): Promise<Listing>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;
  moveToRecycleBin(id: string): Promise<void>;
  restoreFromRecycleBin(id: string): Promise<void>;
  permanentlyDeleteListing(id: string): Promise<void>;
  incrementListingViews(id: string): Promise<void>;

  // Businesses
  getBusinesses(): Promise<Business[]>;
  getBusinessById(id: string): Promise<Business | null>;
  createBusiness(biz: Omit<Business, 'id' | 'createdAt' | 'followerIds' | 'status' | 'blockedMemberIds'>): Promise<Business>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business>;
  toggleFollowBusiness(businessId: string, userId: string): Promise<boolean>;
  transferBusinessOwnership(businessId: string, newOwnerId: string): Promise<void>;
  requestBusinessOwnershipTransfer(businessId: string, newOwnerId: string): Promise<void>;
  approveBusinessOwnershipTransfer(businessId: string, approved: boolean): Promise<void>;
  requestJoinBusiness(businessId: string, userId: string): Promise<void>;
  approveJoinBusiness(businessId: string, userId: string, approved: boolean): Promise<void>;
  blockBusinessMember(businessId: string, memberId: string, blocked: boolean): Promise<void>;

  // Orders & Lifecycle
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  advanceOrderStatus(orderId: string, subOrderId: string, nextState: OrderState, note?: string, actorId?: string): Promise<Order>;
  rejectSubOrder(orderId: string, subOrderId: string, reason: string): Promise<Order>;
  cancelOrder(orderId: string, reason: string): Promise<Order>;
  disputeOrder(orderId: string, reason: string): Promise<Order>;
  extendDeliveryPromise(orderId: string, subOrderId: string, additionalHours: number, reason: string): Promise<Order>;
  submitPaymentDetails(orderId: string, reference: string, senderName: string, amount: number): Promise<Order>;
  verifyPayment(orderId: string, approved: boolean, note?: string): Promise<Order>;
  sellerAcceptSubOrder(orderId: string, subOrderId: string, agreedHours: number): Promise<Order>;
  assignDeliveryAgent(orderId: string, subOrderId: string, agentId: string): Promise<Order>;
  completeDeliveryWithCode(orderId: string, subOrderId: string, code: string): Promise<boolean>;
  confirmBuyerReceipt(orderId: string, subOrderId: string): Promise<Order>;
  getOrdersForUser(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  markSellerPayoutPaid(subOrderId: string): Promise<void>;

  // Reviews & Ratings
  getReviewsForListing(listingId: string): Promise<Review[]>;
  createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;

  // Reports
  createReport(report: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<Report>;
  getReports(): Promise<Report[]>;
  resolveReport(reportId: string, action: 'resolved' | 'dismissed'): Promise<void>;

  // Chat
  getThreadsForUser(userId: string): Promise<ChatThread[]>;
  getMessages(threadId: string): Promise<ChatMessage[]>;
  sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
  blockUser(threadId: string, blockerId: string): Promise<void>;
  agentRespondToOrderReference(messageId: string, orderId: string, action: 'accept' | 'defer'): Promise<void>;

  // Notifications & Outbox
  getNotificationsForUser(userId: string): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  getDevEmailOutbox(): Promise<any[]>;
  runScheduledSweeps(): Promise<void>;

  // Admin & System
  getAuditLogs(): Promise<AuditLogEntry[]>;
  logAdminAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>;
  getHalls(): Promise<Hall[]>;
  updateHall(hall: Hall): Promise<void>;
  getCategories(): Promise<Category[]>;
  updateCategory(cat: Category): Promise<void>;
}
