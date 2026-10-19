/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { accessDecision, AccessUser, meetsRequirement, toAccessUser } from './access';
import { UserProfile } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const MEMBER: AccessUser = { isSellerApproved: false, badges: ['Member'], adminLevel: null };
const APPROVED_SELLER: AccessUser = { isSellerApproved: true, badges: ['Seller'], adminLevel: null };
const BUSINESS_OWNER: AccessUser = { isSellerApproved: false, badges: ['Member', 'Business Owner'], adminLevel: null };
const AGENT: AccessUser = { isSellerApproved: false, badges: ['Member', 'Delivery Agent'], adminLevel: null };
const ADMIN_LEVEL: AccessUser = { isSellerApproved: false, badges: ['Member'], adminLevel: 'moderator' };
const ADMIN_BADGE: AccessUser = { isSellerApproved: false, badges: ['Member', 'Admin'], adminLevel: null };

export function runAccessTests(): { passed: number; total: number; logs: string[] } {
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

  test('guests are sent to login for every requirement', () => {
    for (const requirement of ['signed-in', 'seller', 'agent', 'admin'] as const) {
      assert(accessDecision(null, requirement) === 'login', `guest should get login for ${requirement}`);
    }
  });

  test('a plain signed-in member may pass only signed-in routes', () => {
    assert(accessDecision(MEMBER, 'signed-in') === 'allow', 'member should pass signed-in');
    assert(accessDecision(MEMBER, 'seller') === 'forbidden', 'member should not pass seller');
    assert(accessDecision(MEMBER, 'agent') === 'forbidden', 'member should not pass agent');
    assert(accessDecision(MEMBER, 'admin') === 'forbidden', 'member should not pass admin');
  });

  test('seller access follows the Navbar predicate exactly', () => {
    assert(meetsRequirement(APPROVED_SELLER, 'seller'), 'approved seller should pass');
    assert(meetsRequirement(BUSINESS_OWNER, 'seller'), 'Business Owner badge should pass');
    assert(!meetsRequirement(MEMBER, 'seller'), 'plain member should fail');
  });

  test('agent access requires the Delivery Agent badge', () => {
    assert(meetsRequirement(AGENT, 'agent'), 'agent should pass');
    assert(!meetsRequirement(APPROVED_SELLER, 'agent'), 'seller without badge should fail');
  });

  test('admin access accepts either adminLevel or Admin badge', () => {
    assert(meetsRequirement(ADMIN_LEVEL, 'admin'), 'adminLevel should pass');
    assert(meetsRequirement(ADMIN_BADGE, 'admin'), 'Admin badge should pass');
    assert(!meetsRequirement(AGENT, 'admin'), 'agent should fail');
  });

  test('toAccessUser carries the three fields the checks rely on', () => {
    const profile = {
      id: 'u1',
      fullName: 'Test User',
      username: 'test_user',
      personalEmail: 'a@b.com',
      schoolEmail: 'a@stu.cu.edu.ng',
      isSchoolEmailVerified: true,
      isPersonalEmailVerified: true,
      hallId: 'h1',
      roomNumber: 'A101',
      gender: 'male',
      telegramHandle: '',
      badges: ['Member', 'Delivery Agent'] as const,
      adminLevel: null,
      isSellerApproved: false,
      isSuspended: false,
      ratingAverage: 0,
      ratingCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    } as unknown as UserProfile;

    const access = toAccessUser(profile);
    assert(access !== null, 'toAccessUser should not return null for a profile');
    assert(access!.isSellerApproved === false, 'isSellerApproved should carry over');
    assert(access!.badges.includes('Delivery Agent'), 'badges should carry over');
    assert(access!.adminLevel === null, 'undefined adminLevel should normalize to null');
    assert(toAccessUser(null) === null, 'null profile should map to null');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('access.test')) {
  const result = runAccessTests();
  console.log(`\nAccess Guard Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
