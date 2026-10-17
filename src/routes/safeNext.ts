/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Open-redirect protection for post-auth return paths.
 * Only same-origin relative paths are accepted: the value must start with a
 * single "/", and must not look protocol-relative ("//"), contain a backslash
 * (some browsers treat "\" as "/"), or carry a scheme. Anything else falls
 * back to "/" so a crafted ?next= can never send a signed-in user off-site.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return '/';
  const candidate = raw.trim();
  if (!candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//')) return '/';
  if (candidate.includes('\\')) return '/';
  return candidate;
}

/** Reads `next` from a location search string (e.g. "?next=%2Fcheckout"). */
export function safeNextFromSearch(search: string): string {
  try {
    return safeNext(new URLSearchParams(search).get('next'));
  } catch {
    return '/';
  }
}
