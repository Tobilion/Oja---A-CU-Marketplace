/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_TITLE = 'Oja — Covenant University Campus Marketplace';

/**
 * Per-route document titles. Recycle Bin is listed before the seller portal
 * because both start with /seller and the first match wins.
 */
const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/$/, BASE_TITLE],
  [/^\/listing\//, 'Listing — Oja'],
  [/^\/store\//, 'Store — Oja'],
  [/^\/profile\//, 'Profile — Oja'],
  [/^\/orders/, 'Orders — Oja'],
  [/^\/checkout$/, 'Checkout — Oja'],
  [/^\/messages/, 'Messages — Oja'],
  [/^\/sell$/, 'Sell on Oja — Oja'],
  [/^\/business\/register$/, 'Register a business — Oja'],
  [/^\/seller\/apply$/, 'Seller application — Oja'],
  [/^\/seller\/recycle-bin$/, 'Recycle bin — Oja'],
  [/^\/seller$/, 'Seller portal — Oja'],
  [/^\/agent$/, 'Deliveries — Oja'],
  [/^\/admin/, 'Admin — Oja'],
  [/^\/login$/, 'Sign in — Oja'],
];

export function titleForPath(pathname: string): string {
  for (const [pattern, title] of ROUTE_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return 'Page not found — Oja';
}

export function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);
}
