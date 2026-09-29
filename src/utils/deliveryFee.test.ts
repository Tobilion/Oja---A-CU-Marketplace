/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  calculateSellerBaseFee,
  calculateOrderDeliveryFee,
  calculateLatePenalty,
} from './deliveryFee';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runDeliveryFeeTests(): { passed: number; total: number; logs: string[] } {
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

  // 1. Boundary: ₦9,999 with 4 items (under 10k AND under 5 items => ₦500)
  test('₦9,999 with 4 items returns ₦500', () => {
    const fee = calculateSellerBaseFee(9999, 4);
    assert(fee === 500, `Expected 500, got ${fee}`);
  });

  // 2. Boundary: exactly ₦10,000 with 4 items (subtotal not under 10k => ₦1,000)
  test('₦10,000 with 4 items returns ₦1,000', () => {
    const fee = calculateSellerBaseFee(10000, 4);
    assert(fee === 1000, `Expected 1000, got ${fee}`);
  });

  // 3. Boundary: ₦9,999 with 5 items (count not under 5 => ₦1,000)
  test('₦9,999 with 5 items returns ₦1,000', () => {
    const fee = calculateSellerBaseFee(9999, 5);
    assert(fee === 1000, `Expected 1000, got ${fee}`);
  });

  // 4. Boundary: ₦15,000 with 2 items (over 10k => ₦1,000)
  test('₦15,000 with 2 items returns ₦1,000', () => {
    const fee = calculateSellerBaseFee(15000, 2);
    assert(fee === 1000, `Expected 1000, got ${fee}`);
  });

  // 5. Single seller without shared hall
  test('Single seller order fee calculation', () => {
    const res = calculateOrderDeliveryFee(
      [{ sellerId: 's1', sellerHallId: 'peter', subtotal: 8000, itemCount: 2 }],
      'room_delivery'
    );
    assert(res.finalTotalDeliveryFee === 500, `Expected 500, got ${res.finalTotalDeliveryFee}`);
    assert(!res.sellerBreakdowns[0].qualifiesForHallDiscount, 'Should not qualify for hall discount');
  });

  // 6. Two sellers in different halls (no hall discount)
  test('Two sellers in different halls pay full fees', () => {
    const res = calculateOrderDeliveryFee(
      [
        { sellerId: 's1', sellerHallId: 'peter', subtotal: 8000, itemCount: 2 }, // 500
        { sellerId: 's2', sellerHallId: 'paul', subtotal: 12000, itemCount: 1 }, // 1000
      ],
      'room_delivery'
    );
    assert(res.totalBaseFee === 1500, `Expected 1500 base fee, got ${res.totalBaseFee}`);
    assert(res.totalDiscount === 0, `Expected 0 discount, got ${res.totalDiscount}`);
    assert(res.finalTotalDeliveryFee === 1500, `Expected 1500 final, got ${res.finalTotalDeliveryFee}`);
  });

  // 7. Two sellers in the SAME hall (50% discount on both)
  test('Two sellers in same hall receive 50% discount', () => {
    const res = calculateOrderDeliveryFee(
      [
        { sellerId: 's1', sellerHallId: 'peter', subtotal: 5000, itemCount: 1 }, // base 500 -> 250
        { sellerId: 's2', sellerHallId: 'peter', subtotal: 15000, itemCount: 1 }, // base 1000 -> 500
      ],
      'room_delivery'
    );
    assert(res.totalBaseFee === 1500, `Expected 1500 base fee, got ${res.totalBaseFee}`);
    assert(res.totalDiscount === 750, `Expected 750 discount, got ${res.totalDiscount}`);
    assert(res.finalTotalDeliveryFee === 750, `Expected 750 final, got ${res.finalTotalDeliveryFee}`);
    assert(res.sellerBreakdowns[0].qualifiesForHallDiscount, 'Seller 1 qualifies');
    assert(res.sellerBreakdowns[1].qualifiesForHallDiscount, 'Seller 2 qualifies');
  });

  // 8. Pickup mode has ₦0 delivery fee
  test('Pickup mode has ₦0 delivery fee', () => {
    const res = calculateOrderDeliveryFee(
      [
        { sellerId: 's1', sellerHallId: 'peter', subtotal: 25000, itemCount: 10 },
        { sellerId: 's2', sellerHallId: 'peter', subtotal: 50000, itemCount: 1 },
      ],
      'pickup'
    );
    assert(res.finalTotalDeliveryFee === 0, `Expected 0 fee for pickup, got ${res.finalTotalDeliveryFee}`);
  });

  // 9. Late penalty calculations and admin alert thresholds
  test('Late penalty calculations: on time = 0, 1 day = rate, 2 days = admin alert', () => {
    const onTime = calculateLatePenalty(20000, 0);
    assert(onTime.penaltyAmount === 0 && !onTime.isAlertLevel, 'On time has no penalty');

    const oneDayLate = calculateLatePenalty(20000, 24);
    assert(oneDayLate.penaltyAmount === 1000, `Expected 1000, got ${oneDayLate.penaltyAmount}`);
    assert(!oneDayLate.isAlertLevel, '1 day is not alert level');

    const twoDaysLate = calculateLatePenalty(20000, 48);
    assert(twoDaysLate.penaltyAmount === 2000, `Expected 2000, got ${twoDaysLate.penaltyAmount}`);
    assert(twoDaysLate.isAlertLevel, '2 days late MUST trigger admin alert level');
  });

  // 10. Late-penalty parity with apply_late_penalty SQL (daily floor, 50% cap)
  test('Late penalty parity: daily N200 floor binds on small subtotals', () => {
    // subtotal 2000, 48h late = 2 days: daily 5% = 100 -> floor 200; 2*200 = 400; cap 1000
    const small = calculateLatePenalty(2000, 48);
    assert(small.penaltyAmount === 400, `Expected 400, got ${small.penaltyAmount}`);
    assert(small.daysLate === 2, `Expected 2 days late, got ${small.daysLate}`);
  });

  test('Late penalty parity: 50% cap binds on long delays', () => {
    // subtotal 1000, 72h late = 3 days: 3*200 = 600, cap 500
    const capped = calculateLatePenalty(1000, 72);
    assert(capped.penaltyAmount === 500, `Expected 500, got ${capped.penaltyAmount}`);
  });

  test('Late penalty parity: exact values the SQL expression must reproduce', () => {
    // subtotal 30000, 24h late = 1 day: 1*1500 = 1500, cap 15000
    const large = calculateLatePenalty(30000, 24);
    assert(large.penaltyAmount === 1500, `Expected 1500, got ${large.penaltyAmount}`);
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('deliveryFee.test')) {
  const result = runDeliveryFeeTests();
  console.log(`\nDelivery Fee Engine Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
