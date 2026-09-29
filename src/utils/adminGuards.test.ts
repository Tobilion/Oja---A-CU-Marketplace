/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isOnlyDeliveryAgentDiff } from './adminGuards';
import { canVerifyPayments, canManageLogistics, canModerate, isSuperAdmin } from '../config/appConfig';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runAdminGuardTests(): { passed: number; total: number; logs: string[] } {
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

  test('granting Delivery Agent alone is in logistics scope', () => {
    assert(isOnlyDeliveryAgentDiff(['Member'], ['Member', 'Delivery Agent']), 'Expected true');
  });

  test('revoking Delivery Agent alone is in logistics scope', () => {
    assert(isOnlyDeliveryAgentDiff(['Member', 'Delivery Agent'], ['Member']), 'Expected true');
  });

  test('touching Verified Seller is out of logistics scope', () => {
    assert(!isOnlyDeliveryAgentDiff(['Member'], ['Member', 'Verified Seller']), 'Expected false');
    assert(!isOnlyDeliveryAgentDiff(['Member', 'Delivery Agent'], ['Member', 'Delivery Agent', 'Seller']), 'Expected false');
  });

  test('no diff is not a scoped edit', () => {
    assert(!isOnlyDeliveryAgentDiff(['Member'], ['Member']), 'Expected false');
  });

  test('permission helpers separate the four levels', () => {
    assert(isSuperAdmin('super_admin') && !isSuperAdmin('moderator'), 'isSuperAdmin');
    assert(canVerifyPayments('payment_verifier') && !canVerifyPayments('logistics_admin'), 'payments');
    assert(canManageLogistics('logistics_admin') && !canManageLogistics('payment_verifier'), 'logistics');
    assert(canModerate('moderator') && !canModerate('payment_verifier'), 'moderate');
    assert(!canVerifyPayments(null) && !canManageLogistics(undefined) && !canModerate(null), 'null levels grant nothing');
  });

  test('a logistics admin must not verify payments (role matrix)', () => {
    assert(!canVerifyPayments('logistics_admin'), 'Logistics cannot verify payments');
    assert(!canModerate('payment_verifier'), 'Payment verifier cannot moderate');
    assert(!canManageLogistics('moderator'), 'Moderator cannot manage logistics');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('adminGuards.test')) {
  const result = runAdminGuardTests();
  console.log(`\nAdmin Guard Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
