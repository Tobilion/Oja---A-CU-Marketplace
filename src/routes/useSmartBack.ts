/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Close handler for full pages that used to be overlays. When the visitor
 * arrived through in-app navigation they go back to the previous page;
 * a direct deep link (initial history entry) falls back to the given path
 * so closing never leaves the site.
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key === 'default') {
      navigate(fallback);
      return;
    }
    navigate(-1);
  }, [navigate, location.key, fallback]);
}
