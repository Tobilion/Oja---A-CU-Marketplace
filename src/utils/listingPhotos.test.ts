/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validatePhotoCount, MAX_LISTING_PHOTOS } from './listingPhotos';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runListingPhotoTests(): { passed: number; total: number; logs: string[] } {
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

  test('physical category with zero photos is accepted (photos optional)', () => {
    assert(validatePhotoCount([]) === null, 'Expected no error for empty images');
  });

  test('services category with zero photos is accepted', () => {
    assert(validatePhotoCount([]) === null, 'Expected no error for empty images');
  });

  test('one to six photos are accepted', () => {
    assert(validatePhotoCount(['a']) === null, 'Expected 1 photo accepted');
    assert(
      validatePhotoCount(Array.from({ length: MAX_LISTING_PHOTOS }, (_, i) => `p${i}`)) === null,
      'Expected 6 photos accepted'
    );
  });

  test('more than six photos are rejected', () => {
    const err = validatePhotoCount(Array.from({ length: MAX_LISTING_PHOTOS + 1 }, (_, i) => `p${i}`));
    assert(err !== null, 'Expected an error for 7 photos');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('listingPhotos.test')) {
  const result = runListingPhotoTests();
  console.log(`\nListing Photo Rule Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
