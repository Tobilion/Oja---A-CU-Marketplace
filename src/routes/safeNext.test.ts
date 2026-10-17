/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeNext, safeNextFromSearch } from './safeNext';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runSafeNextTests(): { passed: number; total: number; logs: string[] } {
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

  test('accepts a plain relative path', () => {
    assert(safeNext('/checkout') === '/checkout', 'Expected /checkout to pass through');
  });

  test('accepts a relative path with query string', () => {
    assert(
      safeNext('/orders/abc?highlight=1') === '/orders/abc?highlight=1',
      'Expected relative path with query to pass through'
    );
  });

  test('trims surrounding whitespace', () => {
    assert(safeNext('  /messages  ') === '/messages', 'Expected trimmed value');
  });

  test('falls back for missing or empty values', () => {
    assert(safeNext(null) === '/', 'null should fall back');
    assert(safeNext(undefined) === '/', 'undefined should fall back');
    assert(safeNext('') === '/', 'empty string should fall back');
    assert(safeNext('   ') === '/', 'whitespace-only should fall back');
  });

  test('rejects protocol-relative URLs', () => {
    assert(safeNext('//evil.example.com') === '/', '// should be rejected');
    assert(safeNext('//evil.example.com/checkout') === '/', '// with path should be rejected');
  });

  test('rejects absolute URLs with a scheme', () => {
    assert(safeNext('https://evil.example.com') === '/', 'https should be rejected');
    assert(safeNext('http://evil.example.com') === '/', 'http should be rejected');
    assert(safeNext('javascript:alert(1)') === '/', 'javascript: should be rejected');
    assert(safeNext('data:text/html,x') === '/', 'data: should be rejected');
  });

  test('rejects backslash smuggling', () => {
    assert(safeNext('\\\\evil.example.com') === '/', 'leading backslashes should be rejected');
    assert(safeNext('/\\evil.example.com') === '/', 'mixed slash-backslash should be rejected');
    assert(safeNext('/messages\\..\\..') === '/', 'embedded backslash should be rejected');
  });

  test('rejects paths that do not start with a slash', () => {
    assert(safeNext('checkout') === '/', 'bare relative path should be rejected');
    assert(safeNext('..\\..\\etc') === '/', 'parent traversal without slash should be rejected');
  });

  test('rejects hostile values hidden by percent-encoding', () => {
    assert(safeNext('/%2F%2Fevil.example.com') === '/', 'encoded // should be rejected');
    assert(safeNext('/%5Cevil.example.com') === '/', 'encoded backslash should be rejected');
    assert(safeNext('/messages%5C..%5C..') === '/', 'encoded embedded backslash should be rejected');
    assert(safeNext('/%') === '/', 'malformed encoding should be rejected');
    assert(
      safeNext('/orders/a%2Fb') === '/orders/a%2Fb',
      'ordinary encoded characters should still pass through unchanged'
    );
  });

  test('safeNextFromSearch decodes and validates a next parameter', () => {
    assert(safeNextFromSearch('?next=%2Fcheckout') === '/checkout', 'Encoded /checkout should decode');
    assert(
      safeNextFromSearch('?a=1&next=%2Forders%2F42') === '/orders/42',
      'next among other params should decode'
    );
  });

  test('safeNextFromSearch rejects hostile or absent values', () => {
    assert(safeNextFromSearch('') === '/', 'empty search should fall back');
    assert(safeNextFromSearch('?next=') === '/', 'empty next should fall back');
    assert(safeNextFromSearch('?next=%2F%2Fevil.example.com') === '/', 'encoded // should be rejected');
    assert(
      safeNextFromSearch('?next=https%3A%2F%2Fevil.example.com') === '/',
      'encoded absolute URL should be rejected'
    );
    assert(safeNextFromSearch('?other=1') === '/', 'missing next should fall back');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('safeNext.test')) {
  const result = runSafeNextTests();
  console.log(`\nSafe Next Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
