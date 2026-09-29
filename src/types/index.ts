/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'male' | 'female';

export type UserBadge =
  | 'Member'
  | 'Seller'
  | 'Verified Seller'
  | 'Business Owner'
  | 'Delivery Agent'
  | 'Admin';

export type AdminLevel =
  | 'super_admin'
  | 'moderator'
  | 'payment_verifier'
  | 'logistics_admin';

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  username: string; // e.g. "tobi_j"
  personalEmail: string;
  schoolEmail: string; // must end in @stu.cu.edu.ng
  isSchoolEmailVerified: boolean;
  isPersonalEmailVerified: boolean;
  hallId: string;
  roomNumber: string;
  gender: Gender;
  telegramHandle: string; // optional public handle, e.g. "@janedoe" (may be '')
  phoneNumber?: string; // required at sign-up: Nigerian mobile for order coordination
  matricNumber?: string;
  regNumber?: string;
  bio?: string;
  avatarUrl?: string;
  badges: UserBadge[];
  adminLevel?: AdminLevel | null;
  bankDetails?: BankDetails;
  isSellerApproved: boolean;
  sellerApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  sellerApplicationDate?: string;
  isSuspended: boolean;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

/**
 * Stripped profile for public viewing (M-02)
 * Room number, matric, reg number, personal email, school email, and bank details are strictly excluded.
 */
export interface PublicUserProfile {
  id: string;
  fullName: string;
  username: string;
  hallId: string;
  gender: Gender;
  telegramHandle: string;
  bio?: string;
  avatarUrl?: string;
  badges: UserBadge[];
  adminLevel?: AdminLevel | null;
  isSellerApproved: boolean;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

export function toPublicUserProfile(user: UserProfile): PublicUserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    hallId: user.hallId,
    gender: user.gender,
    telegramHandle: user.telegramHandle,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    badges: user.badges,
    adminLevel: user.adminLevel,
    isSellerApproved: user.isSellerApproved,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    createdAt: user.createdAt,
  };
}

export interface EmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  htmlContent: string;
  type: 'order_placed' | 'order_delivered' | 'seller_application' | 'dispute_opened';
  sentAt: string;
  metadata?: Record<string, any>;
}

export interface Hall {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'mixed';
  active: boolean;
}

export type ListingCondition = 'New' | 'Like new' | 'Good' | 'Fair';

export type ListingPostAs = 'me' | 'business' | 'both';

export interface DynamicFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  dynamicFields: DynamicFieldDef[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  condition: ListingCondition;
  price: number; // Integer naira
  stock: number; // In stock quantity
  images: string[];
  sellerId: string;
  businessId?: string;
  postAs: ListingPostAs;
  defaultDeliveryDays: number;
  dynamicValues: Record<string, string | number>;
  status: 'active' | 'in_recycle_bin' | 'banned' | 'sold_out';
  recycledAt?: string;
  createdAt: string;
  viewsCount: number;
  isReported: boolean;
}

export interface Business {
  id: string;
  name: string;
  handle: string; // unique @handle
  description: string;
  logo: string;
  banner: string;
  categoryId: string;
  contact: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  proofUrl?: string;
  membersPostFreely: boolean;
  memberIds: string[];
  blockedMemberIds: string[];
  joinRequests?: string[];
  transferRequest?: {
    newOwnerId: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
  };
  followerIds: string[];
  createdAt: string;
}

export type OrderState =
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'seller_accepted'
  | 'ready'
  | 'agent_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type DeliveryMode = 'room_delivery' | 'pickup';

export type PaymentMode =
  | 'pay_oja' // Protected Escrow (default)
  | 'pay_on_delivery'
  | 'pay_seller_direct'; // Verified Sellers only with warning

export type PaymentStatus =
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'not_applicable';

export interface OrderItem {
  id: string;
  listingId: string;
  title: string;
  price: number; // Integer naira
  quantity: number;
  image: string;
  categoryId: string;
}

export interface SubOrder {
  id: string;
  orderId: string;
  sellerId: string;
  businessId?: string;
  status: OrderState;
  subtotal: number;
  deliveryFee: number;
  itemsCount: number;
  items: OrderItem[];
  deliveryTimeAgreedHours?: number;
  sellerAcceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  extendedPromiseHours?: number;
  extendedPromiseReason?: string;
  agentId?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  penaltyAmount: number;
  sellerPayoutAmount: number;
  sellerPaidOut: boolean;
  statusTimeline: {
    state: OrderState;
    timestamp: string;
    note?: string;
  }[];
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "OJA-8492"
  buyerId: string;
  deliveryMode: DeliveryMode;
  deliveryHallId: string;
  deliveryRoom: string;
  deliveryNotes?: string;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  senderAccountName?: string;
  paymentAmountPaid?: number;
  deliveryFeeTotal: number;
  itemsSubtotal: number;
  totalAmount: number;
  status: OrderState;
  deliveryCode: string; // 4-digit code e.g. "4928"
  subOrders: SubOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  listingId: string;
  subOrderId: string;
  orderId: string;
  reviewerId: string;
  sellerId?: string;
  rating: number; // 1 to 5 for product
  comment: string;
  agentId?: string; // Optional delivery agent rating
  agentRating?: number; // 1 to 5 for agent
  agentComment?: string;
  createdAt: string;
}

export interface DevEmailNotification {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user' | 'chat_thread' | 'order';
  targetId: string;
  targetTitle?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  referencedOrderId?: string;
  referencedOrderData?: {
    orderNumber: string;
    totalAmount: number;
    status: OrderState;
    deliveryMode: DeliveryMode;
    buyerName: string;
    buyerHall: string;
  };
  createdAt: string;
  readAt?: string;
}

export interface ChatThread {
  id: string;
  participantIds: [string, string];
  lastMessageSnippet: string;
  lastMessageAt: string;
  isRequest: boolean; // if participants haven't mutually interacted before
  isBlockedBy?: string;
  isReported?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'delivery' | 'chat' | 'system' | 'seller' | 'business';
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  beforeValue?: any;
  afterValue?: any;
  timestamp: string;
}

export interface AppSettings {
  ojaBankName: string;
  ojaAccountNumber: string;
  ojaAccountName: string;
  deliveryPromiseHours: number;
  latePenaltyRatePercent: number; // e.g. 5% per late day
  lateThresholdDaysAlert: number; // 2 days
}

export type FeedbackType = 'bug' | 'confusing' | 'idea';
export type FeedbackStatus = 'new' | 'seen' | 'fixed';

/**
 * 6.3 user-submitted issue/idea report. Auto-captured context only; never
 * passwords or personal data beyond the persona name and optional contact.
 */
export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  contact?: string;
  personaName?: string;
  route: string;
  context: string;
  appMode: string;
  appVersion: string;
  browser: string;
  viewport: string;
  timestamp: string;
  breadcrumbs: string[];
  lastError?: string;
  status: FeedbackStatus;
  createdAt: string;
}
