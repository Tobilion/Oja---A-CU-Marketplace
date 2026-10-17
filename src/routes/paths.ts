/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single source of truth for every URL the app understands.
 * Route patterns are consumed by AppRoutes; builders are used everywhere a
 * link is produced so no component ever hand-writes a path.
 */
export const routePatterns = {
  home: '/',
  listing: '/listing/:id',
  store: '/store/:id',
  profile: '/profile/:username',
  orders: '/orders',
  order: '/orders/:orderId',
  checkout: '/checkout',
  messages: '/messages',
  messageThread: '/messages/:threadId',
  sell: '/sell',
  registerBusiness: '/business/register',
  sellerApply: '/seller/apply',
  seller: '/seller',
  recycleBin: '/seller/recycle-bin',
  agent: '/agent',
  admin: '/admin',
  adminTab: '/admin/:tab',
  login: '/login',
} as const;

export const paths = {
  home: '/',
  listing: (id: string) => `/listing/${encodeURIComponent(id)}`,
  store: (id: string) => `/store/${encodeURIComponent(id)}`,
  profile: (username: string) => `/profile/${encodeURIComponent(username)}`,
  orders: '/orders',
  order: (orderId: string) => `/orders/${encodeURIComponent(orderId)}`,
  checkout: '/checkout',
  messages: '/messages',
  messageThread: (threadId: string) => `/messages/${encodeURIComponent(threadId)}`,
  sell: '/sell',
  registerBusiness: '/business/register',
  sellerApply: '/seller/apply',
  seller: '/seller',
  recycleBin: '/seller/recycle-bin',
  agent: '/agent',
  admin: '/admin',
  adminTab: (tab: string) => `/admin/${encodeURIComponent(tab)}`,
  login: '/login',
} as const;

/**
 * Appends a return path to an entry URL (e.g. /login?next=/checkout).
 * The value is encoded; consumers must run it through safeNext() before use.
 */
export function withNext(path: string, next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}
