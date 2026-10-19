/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { stashAuthNext, takeAuthNext, clearAuthNext } from './authReturn';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

export function runAuthReturnTests(): { passed: number; total: number; logs: string[] } {
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

  const storage = createFakeStorage();
  (globalThis as any).window = { sessionStorage: storage };

  test('stashes and consumes a deep link exactly once', () => {
    stashAuthNext('/checkout');
    assert(takeAuthNext() === '/checkout', 'expected stashed path back');
    assert(takeAuthNext() === null, 'stash should be consumed after one read');
  });

  test('consumes a stashed path with query string', () => {
    stashAuthNext('/orders/ord_101?highlight=1');
    assert(takeAuthNext() === '/orders/ord_101?highlight=1', 'query string should survive');
  });

  test('drops hostile stashed values instead of navigating', () => {
    stashAuthNext('//evil.example.com');
    assert(takeAuthNext() === null, 'protocol-relative stash should be dropped');
    stashAuthNext('/%2F%2Fevil.example.com');
    assert(takeAuthNext() === null, 'encoded hostile stash should be dropped');
  });

  test('clearAuthNext removes a pending stash', () => {
    stashAuthNext('/messages');
    clearAuthNext();
    assert(takeAuthNext() === null, 'cleared stash should not be returned');
  });

  test('takeAuthNext returns null when nothing was stashed', () => {
    assert(takeAuthNext() === null, 'empty stash should return null');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('authReturn.test')) {
  const result = runAuthReturnTests();
  console.log(`\nAuth Return Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
