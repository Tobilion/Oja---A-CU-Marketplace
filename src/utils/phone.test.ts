/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isValidNigerianPhone, normalizeNigerianPhone } from './phone';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runPhoneTests(): { passed: number; total: number; logs: string[] } {
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

  test('valid 11-digit numbers pass (080, 070, 090, 081)', () => {
    assert(isValidNigerianPhone('08031234567'), '080');
    assert(isValidNigerianPhone('07039483401'), '070');
    assert(isValidNigerianPhone('09012345678'), '090');
    assert(isValidNigerianPhone('08123456789'), '081');
  });

  test('spaces and dashes are tolerated', () => {
    assert(isValidNigerianPhone('0803 123 4567'), 'spaces');
    assert(isValidNigerianPhone('0803-123-4567'), 'dashes');
    assert(normalizeNigerianPhone('0803 123 4567') === '08031234567', 'normalize');
  });

  test('short, long, prefixed, and lettered inputs fail', () => {
    assert(!isValidNigerianPhone('0803123456'), '10 digits');
    assert(!isValidNigerianPhone('080312345678'), '12 digits');
    assert(!isValidNigerianPhone('+2348031234567'), '+234 prefix');
    assert(!isValidNigerianPhone('0803123456a'), 'letters');
    assert(!isValidNigerianPhone(''), 'empty');
    assert(!isValidNigerianPhone('18031234567'), 'leading 1');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('phone.test')) {
  const result = runPhoneTests();
  console.log(`\nPhone Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
