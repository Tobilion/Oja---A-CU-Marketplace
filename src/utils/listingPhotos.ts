/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { REQUIRE_LISTING_PHOTOS } from '../config/appConfig';

export const MAX_LISTING_PHOTOS = 6;

/**
 * BUG-2: single source of truth for the listing photo rule. Photos are
 * optional (REQUIRE_LISTING_PHOTOS is false); when added, 1 to 6 apply.
 * Returns an error message or null when the count is acceptable.
 */
export function validatePhotoCount(images: string[]): string | null {
  if (REQUIRE_LISTING_PHOTOS && images.length === 0) {
    return 'Please upload at least 1 clear photo of the item.';
  }
  if (images.length > MAX_LISTING_PHOTOS) {
    return `A listing can have at most ${MAX_LISTING_PHOTOS} photos.`;
  }
  return null;
}
