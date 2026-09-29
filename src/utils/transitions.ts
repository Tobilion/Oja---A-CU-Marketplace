/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrderState, AdminLevel } from '../types';
import { canVerifyPayments, canManageLogistics, canModerate, isSuperAdmin } from '../config/appConfig';

export type OrderActorRole = 'buyer' | 'seller' | 'agent' | 'admin';

/**
 * Derives the actor's role on a specific sub-order from ids both backends have.
 * Returns null when the actor is a stranger to the order (no role at all).
 */
export function deriveOrderActorRole(args: {
  buyerId: string;
  sellerId: string;
  agentId?: string | null;
  actorId: string;
  adminLevel?: AdminLevel | null;
}): OrderActorRole | null {
  if (args.actorId === args.buyerId) return 'buyer';
  if (args.actorId === args.sellerId) return 'seller';
  if (args.agentId && args.actorId === args.agentId) return 'agent';
  if (args.adminLevel) return 'admin';
  return null;
}

/**
 * Authoritative Order Lifecycle Transition Matrix.
 * Enforces allowed legal transitions for Oja orders.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  awaiting_payment: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['seller_accepted', 'cancelled', 'refunded'], // Seller accept, or seller reject -> cancelled/refunded
  seller_accepted: ['ready', 'cancelled', 'disputed'],
  ready: ['agent_assigned', 'cancelled', 'disputed'],
  agent_assigned: ['picked_up', 'disputed', 'cancelled'],
  picked_up: ['out_for_delivery', 'disputed'],
  out_for_delivery: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'], // Auto-confirms after 48h or buyer confirms
  completed: ['disputed'], // In rare cases buyer can open dispute post-completion within window
  cancelled: [], // Terminal
  refunded: [], // Terminal
  disputed: ['refunded', 'completed', 'cancelled'], // Resolved by admin
};

/**
 * Validates whether a requested transition is legal and authorized for the actor.
 */
export function validateOrderTransition(
  currentState: OrderState,
  nextState: OrderState,
  actorRole: OrderActorRole,
  adminLevel?: AdminLevel | null
): { allowed: boolean; reason?: string } {
  const allowedNext = VALID_ORDER_TRANSITIONS[currentState] || [];
  if (!allowedNext.includes(nextState)) {
    return {
      allowed: false,
      reason: `Illegal state transition from "${currentState}" to "${nextState}".`,
    };
  }

  // Role & Admin Level permission checks
  switch (nextState) {
    case 'payment_confirmed':
      if (actorRole !== 'admin' || !canVerifyPayments(adminLevel)) {
        return {
          allowed: false,
          reason: 'Only a Payment Verifier or Super Admin can confirm escrow payments.',
        };
      }
      break;

    case 'seller_accepted':
      if (actorRole !== 'seller' && !isSuperAdmin(adminLevel)) {
        return { allowed: false, reason: 'Only the assigned seller can accept this sub-order.' };
      }
      break;

    case 'ready':
      if (actorRole !== 'seller' && !isSuperAdmin(adminLevel)) {
        return { allowed: false, reason: 'Only the seller can mark items ready for pickup.' };
      }
      break;

    case 'agent_assigned':
      if (actorRole !== 'agent' && !canManageLogistics(adminLevel)) {
        return {
          allowed: false,
          reason: 'Only delivery agents or logistics admins can assign deliveries.',
        };
      }
      break;

    case 'picked_up':
    case 'out_for_delivery':
      if (actorRole !== 'agent' && !canManageLogistics(adminLevel)) {
        return {
          allowed: false,
          reason: 'Only the assigned delivery agent or logistics admin can advance delivery transit states.',
        };
      }
      break;

    case 'delivered':
      if (actorRole !== 'agent' && !canManageLogistics(adminLevel)) {
        return { allowed: false, reason: 'Delivery completion requires agent handover.' };
      }
      break;

    case 'completed':
      // Buyer confirms receipt, or automated system sweep confirms after 48h
      if (actorRole !== 'buyer' && !isSuperAdmin(adminLevel)) {
        return { allowed: false, reason: 'Only the buyer or system auto-confirm can complete the order.' };
      }
      break;

    case 'cancelled':
      // Allowed if seller rejects, or buyer cancels while awaiting payment, or admin intervenes
      if (actorRole === 'buyer' && currentState !== 'awaiting_payment') {
        return { allowed: false, reason: 'Buyers cannot unilaterally cancel after payment is confirmed.' };
      }
      if (actorRole === 'admin' && !canModerate(adminLevel)) {
        return { allowed: false, reason: 'Only a Moderator or Super Admin can cancel active orders.' };
      }
      break;

    case 'refunded':
      if (actorRole !== 'admin' || !canVerifyPayments(adminLevel)) {
        return {
          allowed: false,
          reason: 'Only a Payment Verifier or Super Admin can authorize refunds.',
        };
      }
      break;

    case 'disputed':
      if (actorRole !== 'buyer' && actorRole !== 'seller' && !canModerate(adminLevel)) {
        return { allowed: false, reason: 'Only parties involved or moderators can dispute an order.' };
      }
      break;
  }

  return { allowed: true };
}
