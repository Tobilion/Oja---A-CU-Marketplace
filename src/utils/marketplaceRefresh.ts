/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MARKETPLACE_REFRESH_EVENT = 'oja:marketplace-refresh';

/**
 * Asks the root App to reload the shared marketplace data (listings,
 * businesses, halls, categories). Route pages hold no reference to App's
 * data state, so mutations such as placing an order announce themselves
 * through this event instead of prop callbacks.
 */
export function requestMarketplaceRefresh(): void {
  window.dispatchEvent(new Event(MARKETPLACE_REFRESH_EVENT));
}
