/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { safeNext } from './safeNext';

const AUTH_NEXT_KEY = 'oja:auth-next';

function getStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Remembers the route the visitor was heading to before starting a Google
 * OAuth redirect. The redirect leaves the page entirely, so the value must
 * survive in sessionStorage; it is validated again on read.
 */
export function stashAuthNext(path: string): void {
  try {
    getStore()?.setItem(AUTH_NEXT_KEY, path);
  } catch {
    // sessionStorage can be unavailable (private mode); deep-link restore is
    // best-effort and the visitor simply lands on the fallback route.
  }
}

export function clearAuthNext(): void {
  try {
    getStore()?.removeItem(AUTH_NEXT_KEY);
  } catch {
    // See stashAuthNext.
  }
}

/**
 * Reads and consumes the stashed route. Returns null when nothing was
 * stashed or when the value fails safeNext validation, so callers never
 * navigate to a hostile target.
 */
export function takeAuthNext(): string | null {
  const store = getStore();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(AUTH_NEXT_KEY);
    store.removeItem(AUTH_NEXT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  const safe = safeNext(raw);
  if (safe === '/' && raw.trim() !== '/') return null;
  return safe;
}
