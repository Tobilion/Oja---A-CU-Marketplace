/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { paths, routePatterns, withNext } from './paths';
import { safeNextFromSearch } from './safeNext';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runPathsTests(): { passed: number; total: number; logs: string[] } {
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

  test('static paths are plain absolute paths', () => {
    assert(paths.home === '/', 'home should be /');
    assert(paths.orders === '/orders', 'orders should be /orders');
    assert(paths.checkout === '/checkout', 'checkout should be /checkout');
    assert(paths.messages === '/messages', 'messages should be /messages');
    assert(paths.sell === '/sell', 'sell should be /sell');
    assert(paths.registerBusiness === '/business/register', 'registerBusiness should be /business/register');
    assert(paths.sellerApply === '/seller/apply', 'sellerApply should be /seller/apply');
    assert(paths.seller === '/seller', 'seller should be /seller');
    assert(paths.recycleBin === '/seller/recycle-bin', 'recycleBin should be /seller/recycle-bin');
    assert(paths.agent === '/agent', 'agent should be /agent');
    assert(paths.admin === '/admin', 'admin should be /admin');
    assert(paths.login === '/login', 'login should be /login');
  });

  test('parameterized builders substitute and encode values', () => {
    assert(paths.listing('abc123') === '/listing/abc123', 'listing id should be substituted');
    assert(paths.store('biz9') === '/store/biz9', 'store id should be substituted');
    assert(paths.profile('tobi_j') === '/profile/tobi_j', 'username should be substituted');
    assert(paths.order('o-1') === '/orders/o-1', 'order id should be substituted');
    assert(paths.messageThread('t-1') === '/messages/t-1', 'thread id should be substituted');
    assert(paths.adminTab('reports') === '/admin/reports', 'admin tab should be substituted');
  });

  test('parameterized builders percent-encode unsafe characters', () => {
    assert(paths.listing('a b') === '/listing/a%20b', 'space should be encoded');
    assert(paths.profile('odd/name') === '/profile/odd%2Fname', 'slash should be encoded in a segment');
    assert(paths.adminTab('a?b') === '/admin/a%3Fb', 'question mark should be encoded');
  });

  test('route patterns match the declared URL design', () => {
    assert(routePatterns.listing === '/listing/:id', 'listing pattern');
    assert(routePatterns.store === '/store/:id', 'store pattern');
    assert(routePatterns.profile === '/profile/:username', 'profile pattern');
    assert(routePatterns.order === '/orders/:orderId', 'order pattern');
    assert(routePatterns.messageThread === '/messages/:threadId', 'thread pattern');
    assert(routePatterns.adminTab === '/admin/:tab', 'admin tab pattern');
  });

  test('withNext encodes a return path that round-trips through safeNextFromSearch', () => {
    const loginUrl = withNext(paths.login, '/checkout');
    assert(loginUrl === '/login?next=%2Fcheckout', `unexpected withNext output: ${loginUrl}`);
    const search = loginUrl.slice(loginUrl.indexOf('?'));
    assert(safeNextFromSearch(search) === '/checkout', 'next should round-trip');
  });

  test('withNext keeps nested paths and query strings intact after round-trip', () => {
    const target = '/orders/o 1?tab=delivery';
    const search = withNext(paths.login, target).split('?').slice(1).join('?');
    assert(safeNextFromSearch(`?${search}`) === target, 'nested path with query should round-trip');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('paths.test')) {
  const result = runPathsTests();
  console.log(`\nPaths Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
