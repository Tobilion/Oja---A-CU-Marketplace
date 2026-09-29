/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateOrderTransition, VALID_ORDER_TRANSITIONS } from './transitions';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('--- RUNNING ORDER STATE MACHINE TESTS ---');

// 1. Valid Happy Path transitions
const t1 = validateOrderTransition('awaiting_payment', 'payment_confirmed', 'admin', 'payment_verifier');
assert(t1.allowed, 'Payment verifier can confirm payment');

const t1b = validateOrderTransition('awaiting_payment', 'payment_confirmed', 'admin', 'super_admin');
assert(t1b.allowed, 'Super admin can confirm payment');

const t2 = validateOrderTransition('payment_confirmed', 'seller_accepted', 'seller');
assert(t2.allowed, 'Seller can accept sub-order');

const t3 = validateOrderTransition('seller_accepted', 'ready', 'seller');
assert(t3.allowed, 'Seller can mark ready');

const t4 = validateOrderTransition('ready', 'agent_assigned', 'agent');
assert(t4.allowed, 'Agent can assign');

const t4b = validateOrderTransition('ready', 'agent_assigned', 'admin', 'logistics_admin');
assert(t4b.allowed, 'Logistics admin can assign delivery agent');

const t5 = validateOrderTransition('agent_assigned', 'picked_up', 'agent');
assert(t5.allowed, 'Agent can mark picked up');

const t6 = validateOrderTransition('picked_up', 'out_for_delivery', 'agent');
assert(t6.allowed, 'Agent can mark out for delivery');

const t7 = validateOrderTransition('out_for_delivery', 'delivered', 'agent');
assert(t7.allowed, 'Agent can mark delivered');

const t8 = validateOrderTransition('delivered', 'completed', 'buyer');
assert(t8.allowed, 'Buyer can complete order');

// 2. Cancellation and refund paths
const t9 = validateOrderTransition('awaiting_payment', 'cancelled', 'buyer');
assert(t9.allowed, 'Buyer can cancel while awaiting payment');

const t10 = validateOrderTransition('payment_confirmed', 'refunded', 'admin', 'payment_verifier');
assert(t10.allowed, 'Payment verifier can authorize refund');

const t11 = validateOrderTransition('payment_confirmed', 'cancelled', 'admin', 'moderator');
assert(t11.allowed, 'Moderator can cancel payment confirmed order');

// 3. Dispute paths
const t12 = validateOrderTransition('seller_accepted', 'disputed', 'buyer');
assert(t12.allowed, 'Buyer can dispute an accepted order');

const t13 = validateOrderTransition('disputed', 'refunded', 'admin', 'payment_verifier');
assert(t13.allowed, 'Disputed order can be resolved to refunded by payment verifier');

const t14 = validateOrderTransition('disputed', 'completed', 'admin', 'super_admin');
assert(t14.allowed, 'Super admin can resolve dispute to completed');

// 4. ILLEGAL TRANSITIONS (Matrix rejections)
const e1 = validateOrderTransition('awaiting_payment', 'delivered', 'admin', 'super_admin');
assert(!e1.allowed, 'Direct skip from awaiting_payment to delivered must be rejected');

const e2 = validateOrderTransition('cancelled', 'completed', 'admin', 'super_admin');
assert(!e2.allowed, 'Terminal state cancelled cannot transition to completed');

const e3 = validateOrderTransition('refunded', 'ready', 'admin', 'super_admin');
assert(!e3.allowed, 'Terminal state refunded cannot transition to ready');

// 5. UNAUTHORIZED ACTOR CHECKS
const e4 = validateOrderTransition('awaiting_payment', 'payment_confirmed', 'admin', 'logistics_admin');
assert(!e4.allowed, 'Logistics admin CANNOT confirm payment');

const e5 = validateOrderTransition('awaiting_payment', 'payment_confirmed', 'buyer');
assert(!e5.allowed, 'Buyer CANNOT confirm payment');

const e6 = validateOrderTransition('payment_confirmed', 'seller_accepted', 'buyer');
assert(!e6.allowed, 'Buyer CANNOT accept sub-order');

const e7 = validateOrderTransition('ready', 'agent_assigned', 'buyer');
assert(!e7.allowed, 'Buyer CANNOT assign delivery agent');

const e8 = validateOrderTransition('payment_confirmed', 'cancelled', 'buyer');
assert(!e8.allowed, 'Buyer CANNOT cancel once payment is confirmed');

const e9 = validateOrderTransition('payment_confirmed', 'refunded', 'admin', 'logistics_admin');
assert(!e9.allowed, 'Logistics admin CANNOT issue refunds');

console.log('ALL 23 STATE MACHINE TESTS PASSED SUCCESSFULLY.');
