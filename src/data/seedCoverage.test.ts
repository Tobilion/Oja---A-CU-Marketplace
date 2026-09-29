/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SEED_USERS } from './seedUsers';
import { SEED_LISTINGS } from './seedListings';
import { SEED_ORDERS, SEED_REVIEWS } from './seedOrders';
import { EXTRA_USERS, EXTRA_BUSINESSES, EXTRA_LISTINGS, EXTRA_ORDERS, EXTRA_REVIEWS } from './seedExtra';
import { SEED_BUSINESSES } from './seedUsers';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const USERS = [...SEED_USERS, ...EXTRA_USERS];
const BUSINESSES = [...SEED_BUSINESSES, ...EXTRA_BUSINESSES];
const LISTINGS = [...SEED_LISTINGS, ...EXTRA_LISTINGS];
const ORDERS = [...SEED_ORDERS, ...EXTRA_ORDERS];
const REVIEWS = [...SEED_REVIEWS, ...EXTRA_REVIEWS];

export function runSeedCoverageTests(): { passed: number; total: number; logs: string[] } {
  const logs: string[] = [];
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      logs.push(`PASS: ${name}`);
    } catch (e: any) {
      logs.push(`FAIL: ${name} -> ${e.message}`);
    }
  }

  test('at least 30 users across all 10 halls', () => {
    assert(USERS.length >= 30, `Expected >= 30 users, got ${USERS.length}`);
    const halls = new Set(USERS.map((u) => u.hallId));
    assert(halls.size >= 10, `Expected 10 halls covered, got ${halls.size}`);
  });

  test('4 agents of both genders plus moderator, payment, logistics, super admins', () => {
    const agents = USERS.filter((u) => u.badges.includes('Delivery Agent'));
    assert(agents.length >= 4, `Expected >= 4 agents, got ${agents.length}`);
    assert(agents.some((a) => a.gender === 'male') && agents.some((a) => a.gender === 'female'), 'Expected both genders');
    assert(USERS.some((u) => u.adminLevel === 'moderator'), 'Missing moderator persona');
    assert(USERS.some((u) => u.adminLevel === 'payment_verifier'), 'Missing payment verifier persona');
    assert(USERS.some((u) => u.adminLevel === 'logistics_admin'), 'Missing logistics admin persona');
    assert(USERS.filter((u) => u.adminLevel === 'super_admin').length >= 2, 'Missing founding super admins');
  });

  test('6+ businesses with pending approvals', () => {
    assert(BUSINESSES.length >= 6, `Expected >= 6 businesses, got ${BUSINESSES.length}`);
    assert(BUSINESSES.filter((b) => b.status === 'pending').length >= 2, 'Expected >= 2 pending businesses');
  });

  test('100+ listings across all 8 categories with photo-less entries', () => {
    assert(LISTINGS.length >= 100, `Expected >= 100 listings, got ${LISTINGS.length}`);
    const cats = new Set(LISTINGS.map((l) => l.categoryId));
    assert(cats.size >= 8, `Expected 8 categories, got ${cats.size}`);
    const photoLess = LISTINGS.filter((l) => l.images.length === 0);
    assert(photoLess.length >= 9, `Expected >= 9 photo-less listings, got ${photoLess.length}`);
  });

  test('orders in every lifecycle state plus side exits', () => {
    const states = new Set<string>();
    for (const o of ORDERS) {
      states.add(o.status);
      for (const s of o.subOrders) states.add(s.status);
    }
    const required = [
      'awaiting_payment', 'payment_confirmed', 'seller_accepted', 'ready', 'agent_assigned',
      'picked_up', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed',
    ];
    for (const s of required) assert(states.has(s), `Missing order state: ${s}`);
  });

  test('multi-seller hall-discount math on the seeded order', () => {
    const ord = ORDERS.find((o) => o.id === 'ord_202');
    assert(!!ord, 'Missing ord_202');
    assert(ord!.itemsSubtotal === 28000 && ord!.deliveryFeeTotal === 750, `Bad ord_202 totals: ${ord!.itemsSubtotal}+${ord!.deliveryFeeTotal}`);
    assert(ord!.totalAmount === 28750, `Bad ord_202 total: ${ord!.totalAmount}`);
  });

  test('late-order penalty math on the seeded order', () => {
    const ord = ORDERS.find((o) => o.id === 'ord_208');
    assert(!!ord, 'Missing ord_208');
    assert(ord!.subOrders[0].penaltyAmount === 17500, `Bad penalty: ${ord!.subOrders[0].penaltyAmount}`);
    assert(ord!.subOrders[0].sellerPayoutAmount === 157500, 'Bad payout after penalty');
  });

  test('pay-on-delivery order awaiting verification exists', () => {
    const pod = ORDERS.find((o) => o.paymentMode === 'pay_on_delivery' && o.paymentStatus === 'pending_verification');
    assert(!!pod, 'Missing POD awaiting-verification order');
  });

  test('reviews reference completed (or sweep-completing) orders, agents rated', () => {
    for (const r of REVIEWS) {
      const ord = ORDERS.find((o) => o.id === r.orderId);
      assert(!!ord, `Review ${r.id} references missing order`);
      assert(ord!.status === 'completed' || ord!.status === 'delivered', `Review ${r.id} on non-completed order ${ord!.status}`);
    }
    assert(REVIEWS.some((r) => r.agentId && r.agentRating), 'Missing delivery-agent ratings');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('seedCoverage.test')) {
  const result = runSeedCoverageTests();
  console.log(`\nSeed Coverage Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
