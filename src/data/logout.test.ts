/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pickCurrentUser } from './mockStorage';
import { UserProfile } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function fakeUser(id: string): UserProfile {
  return {
    id,
    fullName: 'Test User',
    username: 'test_' + id,
    personalEmail: '',
    schoolEmail: id + '@stu.cu.edu.ng',
    isSchoolEmailVerified: true,
    isPersonalEmailVerified: false,
    hallId: 'hall_peter',
    roomNumber: 'A-101',
    gender: 'male',
    telegramHandle: '@test',
    badges: ['Member'],
    adminLevel: null,
    isSellerApproved: false,
    isSuspended: false,
    ratingAverage: 5.0,
    ratingCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export function runLogoutTests(): { passed: number; total: number; logs: string[] } {
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

  const users = [fakeUser('u1'), fakeUser('u2')];

  test('stored null (logged out) resolves to guest, not users[0]', () => {
    assert(pickCurrentUser(null, users) === null, 'Expected null guest');
  });

  test('stored empty string resolves to guest', () => {
    assert(pickCurrentUser('', users) === null, 'Expected null guest');
  });

  test('stored logout sentinel resolves to guest', () => {
    assert(pickCurrentUser('__logged_out__', users) === null, 'Expected null guest');
  });

  test('unknown id (deleted user) resolves to guest', () => {
    assert(pickCurrentUser('deleted_id', users) === null, 'Expected null guest');
  });

  test('valid stored id resolves to that user', () => {
    const found = pickCurrentUser('u2', users);
    assert(found !== null && found.id === 'u2', 'Expected user u2');
  });

  test('guest resolution is idempotent across repeated logouts', () => {
    assert(pickCurrentUser(null, users) === null, 'First logout stays guest');
    assert(pickCurrentUser(null, users) === null, 'Double logout stays guest');
  });

  test('empty user list never fabricates a session', () => {
    assert(pickCurrentUser('u1', []) === null, 'Expected null with no users');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('logout.test')) {
  const result = runLogoutTests();
  console.log(`\nLogout Session Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
