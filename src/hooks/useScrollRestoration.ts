/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll behaviour for route changes: new pages start at the top, while
 * browser back/forward (POP) restores the scroll position the visitor left.
 * Positions are kept in memory keyed by the history entry, so reloads start
 * clean instead of resurrecting stale offsets.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());

  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, positions.current.get(location.key) ?? 0);
      return;
    }
    // A hash navigation (e.g. /#explore) scrolls itself to the target element;
    // forcing the top here would cancel that scroll.
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.key, navigationType, location.hash]);

  useEffect(() => {
    const key = location.key;
    const onScroll = () => {
      positions.current.set(key, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);
}
